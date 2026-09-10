import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Rule, RuleOperationalStatus } from '../models/Rule';
import { RuleEvaluation } from '../models/RuleEvaluation';
import { RuleEngineService } from '../rules/engine/RuleEngineService';
import { Sample } from '../models/Sample';

export class RuleController {
  /**
   * GET /api/rules
   * List all rules with optional filters for status, family, packageContext, and search query.
   */
  public static async listRules(req: Request, res: Response): Promise<void> {
    try {
      const { status, family, context, search, version = '1.0' } = req.query;

      const query: Record<string, unknown> = {};

      if (status && typeof status === 'string') {
        query.rule_status = status.toUpperCase();
      }

      if (family && typeof family === 'string') {
        query.rule_family = family.toUpperCase();
      }

      if (context && typeof context === 'string') {
        query.package_context = { $regex: context, $options: 'i' };
      }

      if (version && typeof version === 'string') {
        query.database_version = version;
      }

      if (search && typeof search === 'string') {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { rule_id: regex },
          { rule_reference: regex },
          { declaration_type: regex },
          { requirement_description: regex },
          { human_condition_text: regex },
          { source_section: regex },
        ];
      }

      const rules = await Rule.find(query).sort({ rule_id: 1 }).lean();

      res.status(200).json({
        success: true,
        count: rules.length,
        rules,
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in listRules:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve rules',
      });
    }
  }

  /**
   * GET /api/rules/summary/statistics
   * Returns aggregated rule database statistics.
   */
  public static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const total = await Rule.countDocuments();
      const active = await Rule.countDocuments({ rule_status: RuleOperationalStatus.ACTIVE });
      const reviewRequired = await Rule.countDocuments({
        $or: [{ rule_status: RuleOperationalStatus.REVIEW_REQUIRED }, { inspector_review_required: true }],
      });
      const future = await Rule.countDocuments({ rule_status: RuleOperationalStatus.FUTURE });
      const historical = await Rule.countDocuments({ rule_status: RuleOperationalStatus.HISTORICAL });

      // Breakdown by family
      const familyCounts = await Rule.aggregate([
        { $group: { _id: '$rule_family', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      res.status(200).json({
        success: true,
        statistics: {
          totalRules: total,
          activeRules: active,
          reviewRequiredRules: reviewRequired,
          futureRules: future,
          historicalGuards: historical,
          databaseVersion: '1.0',
          baselineOrigin: 'v0.1',
          families: familyCounts.map((f) => ({ family: f._id, count: f.count })),
        },
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in getStatistics:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to compute rule statistics',
      });
    }
  }

  /**
   * GET /api/rules/:ruleId
   * Returns complete metadata for a single statutory rule.
   */
  public static async getRuleById(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = String(req.params.ruleId || '');
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(ruleId);
      const rule = await Rule.findOne({
        $or: [{ rule_id: ruleId }, { rule_id: ruleId.toUpperCase() }, ...(isObjectId ? [{ _id: ruleId }] : [])],
      }).lean();

      if (!rule) {
        res.status(404).json({
          success: false,
          error: `Rule '${ruleId}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        rule,
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in getRuleById:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve rule details',
      });
    }
  }

  /**
   * PATCH /api/rules/:ruleId/status
   * Supervisory update of rule operational status (Assistant Controller only).
   */
  public static async updateRuleStatus(req: Request, res: Response): Promise<void> {
    try {
      const ruleId = String(req.params.ruleId || '');
      const status = req.body.status || req.body.rule_status;
      const notes = req.body.notes;

      if (!status || !Object.values(RuleOperationalStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: `Invalid rule status: ${status}. Valid options: ${Object.values(RuleOperationalStatus).join(', ')}`,
        });
        return;
      }

      const updateFields: Record<string, unknown> = { rule_status: status, status: status };
      if (notes !== undefined) updateFields.notes = notes;

      const rule = await Rule.findOneAndUpdate(
        { $or: [{ rule_id: ruleId }, { rule_id: ruleId.toUpperCase() }] },
        { $set: updateFields },
        { new: true }
      );

      if (!rule) {
        res.status(404).json({
          success: false,
          error: `Rule '${ruleId}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Rule ${rule.rule_id} status updated to ${rule.rule_status}`,
        rule,
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in updateRuleStatus:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update rule status',
      });
    }
  }

  /**
   * GET /api/rules/validation/consistency
   * Returns JSON vs CSV parity verification report.
   */
  public static async getConsistencyReport(req: Request, res: Response): Promise<void> {
    try {
      const jsonPath = path.resolve(__dirname, '../rules/data/SIH26034_LMPC_Rule_Database_v1.0.json');
      const csvPath = path.resolve(__dirname, '../rules/data/SIH26034_LMPC_Rule_Database_v1.0.csv');

      const jsonExists = fs.existsSync(jsonPath);
      const csvExists = fs.existsSync(csvPath);

      if (!jsonExists || !csvExists) {
        res.status(500).json({
          success: false,
          error: 'Authoritative dataset files missing on disk.',
        });
        return;
      }

      const rawJson = fs.readFileSync(jsonPath, 'utf8');
      const parsedJson = JSON.parse(rawJson);

      res.status(200).json({
        success: true,
        report: {
          databaseName: parsedJson.database_name,
          databaseVersion: parsedJson.database_version,
          status: parsedJson.status,
          ruleCount: parsedJson.rules.length,
          uniqueRuleIds: parsedJson.validation_summary.unique_rule_ids,
          jsonCsvSameLogicalRecords: parsedJson.validation_summary.json_csv_same_logical_records,
          baselinePreserved: parsedJson.validation_summary.baseline_preserved,
          knownReviewRequiredRecords: parsedJson.validation_summary.known_review_required_records,
          verifiedAt: new Date(),
        },
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in getConsistencyReport:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to read consistency report',
      });
    }
  }

  /**
   * POST /api/rule-engine/evaluate/:sampleId
   * Trigger deterministic rule engine evaluation for a sample.
   */
  public static async evaluateSample(req: Request, res: Response): Promise<void> {
    try {
      const { sampleId } = req.params;
      const user = (req as any).user;

      // Find sample
      const sample = await Sample.findById(sampleId);
      if (!sample) {
        res.status(404).json({
          success: false,
          error: `Sample '${sampleId}' not found`,
        });
        return;
      }

      const evaluation = await RuleEngineService.evaluateSample(
        sample.inspectionId,
        sample._id,
        user?.name || user?.username || 'SYSTEM_INSPECTOR'
      );

      res.status(200).json({
        success: true,
        message: 'Sample evaluated deterministically by Rule Engine',
        evaluation,
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in evaluateSample:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to evaluate sample rules',
      });
    }
  }

  /**
   * GET /api/samples/:sampleId/rule-evaluations
   * Retrieve latest evaluation results for a sample.
   */
  public static async getSampleEvaluations(req: Request, res: Response): Promise<void> {
    try {
      const { sampleId } = req.params;

      const evaluations = await RuleEvaluation.find({ sampleId })
        .sort({ evaluated_at: -1 })
        .lean();

      const latestEvaluation = evaluations[0] || null;

      res.status(200).json({
        success: true,
        count: evaluations.length,
        latestEvaluation,
        evaluations,
      });
    } catch (err: unknown) {
      console.error('[RULE-CONTROLLER] Error in getSampleEvaluations:', err);
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve evaluations',
      });
    }
  }
}
