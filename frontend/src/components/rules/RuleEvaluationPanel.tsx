import React, { useState } from 'react';
import {
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RuleEvaluationData, RuleEvaluationItem } from '../../services/ruleService';

interface RuleEvaluationPanelProps {
  sampleId: string;
  sampleNumber: number;
  packageContext: string;
  commodity: string;
  evaluation: RuleEvaluationData | null;
  isEvaluating: boolean;
  onEvaluate: () => void;
  error: string | null;
  success: string | null;
}

export const RuleEvaluationPanel: React.FC<RuleEvaluationPanelProps> = ({
  sampleNumber,
  packageContext,
  evaluation,
  isEvaluating,
  onEvaluate,
  error,
  success,
}) => {
  const [filterTab, setFilterTab] = useState<'applicable' | 'violations' | 'review' | 'exempt' | 'all'>('applicable');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'PASS':
        return (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            Satisfied
          </span>
        );
      case 'POTENTIAL_VIOLATION':
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            Missing Declaration
          </span>
        );
      case 'EXEMPT':
        return (
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Exempt
          </span>
        );
      case 'SCOPE_EXCLUDED':
        return (
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
            Scope Excluded (Rule 3)
          </span>
        );
      case 'REVIEW_REQUIRED':
        return (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 inline" /> Official Review
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            Not Applicable
          </span>
        );
    }
  };

  const getMandateBadge = (mandate: string) => {
    switch (mandate) {
      case 'MANDATORY':
        return <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">Mandatory</span>;
      case 'CONDITIONAL':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">Conditional</span>;
      case 'OPTIONAL':
        return <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Optional</span>;
      case 'NOT_APPLICABLE':
        return <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Not Applicable</span>;
      default:
        return <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{mandate}</span>;
    }
  };

  const filteredRules: RuleEvaluationItem[] = evaluation
    ? evaluation.rules_evaluated.filter((item) => {
        if (filterTab === 'applicable') return item.applicability_status === 'APPLICABLE';
        if (filterTab === 'violations') return item.validation_result === 'POTENTIAL_VIOLATION';
        if (filterTab === 'review')
          return item.requires_inspector_review || item.applicability_status === 'REVIEW_REQUIRED';
        if (filterTab === 'exempt')
          return (
            item.applicability_status === 'NOT_APPLICABLE' ||
            item.validation_result === 'EXEMPT' ||
            item.validation_result === 'SCOPE_EXCLUDED'
          );
        return true;
      })
    : [];

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader
        title="Deterministic Rule Engine Evaluation"
        subtitle={`Codified LMPC rules evaluated for specimen #${sampleNumber} (${packageContext.replace(/_/g, ' ')})`}
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={isEvaluating}
            onClick={onEvaluate}
            icon={
              isEvaluating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : evaluation ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Scale className="w-3.5 h-3.5" />
              )
            }
          >
            {isEvaluating
              ? 'Evaluating Rules...'
              : evaluation
              ? 'Re-evaluate Rules'
              : 'Evaluate Rules'}
          </Button>
        }
      />
      <CardContent className="space-y-4 text-xs">
        {/* Alerts */}
        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Statutory Notice Banner */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-950 flex items-start space-x-2.5">
          <Scale className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold text-indigo-900">Deterministic Legal Metrology Layer:</span>{' '}
            Applicability is resolved deterministically from the 33-rule database under Rule 3 scope exclusions and Rule 26 exemptions.
            AI observations from Phase 10 provide verbatim evidence; the Rule Engine determines legal requirement applicability.
          </div>
        </div>

        {!evaluation ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-100/60 text-indigo-700 flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Rule Engine Evaluation Not Run Yet</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                Run deterministic compliance evaluation across all 33 statutory LMPC rules tailored to this package context ({packageContext.replace(/_/g, ' ')}).
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onEvaluate}
              disabled={isEvaluating}
              icon={isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
            >
              {isEvaluating ? 'Evaluating Rules...' : 'Evaluate Rules (Deterministic Engine)'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* KPI Telemetry Header */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Applicable</span>
                <span className="text-lg font-black text-blue-700">{evaluation.summary.applicable_count}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Mandatory</span>
                <span className="text-lg font-black text-slate-900">{evaluation.summary.mandatory_count}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Review Required</span>
                <span className="text-lg font-black text-amber-600">{evaluation.summary.review_required_count}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Scope Excluded/Exempt</span>
                <span className="text-lg font-black text-purple-700">{evaluation.summary.not_applicable_count}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 block font-semibold">Potential Issues</span>
                <span className="text-lg font-black text-red-600">{evaluation.summary.potential_violations_count}</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
              {[
                { id: 'applicable', label: `Applicable (${evaluation.summary.applicable_count})` },
                { id: 'violations', label: `Potential Issues (${evaluation.summary.potential_violations_count})` },
                { id: 'review', label: `Official Review (${evaluation.summary.review_required_count})` },
                { id: 'exempt', label: `Exempt/Excluded (${evaluation.summary.not_applicable_count})` },
                { id: 'all', label: `All 33 Rules` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterTab === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Evaluated Rules List */}
            <div className="space-y-2.5">
              {filteredRules.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg">
                  No rules in this filter category.
                </div>
              ) : (
                filteredRules.map((item) => {
                  const isExpanded = expandedRuleId === item.rule_id;

                  return (
                    <div
                      key={item.rule_id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {item.rule_reference}
                          </span>
                          <span className="font-bold text-xs text-slate-900">
                            {item.declaration_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {item.rule_id}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {getMandateBadge(item.mandatory_status)}
                          {getOutcomeBadge(item.validation_result)}
                          <button
                            onClick={() => setExpandedRuleId(isExpanded ? null : item.rule_id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-700 text-xs leading-relaxed font-medium">
                        {item.requirement_description}
                      </p>

                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1 text-[11px]">
                        <div className="text-slate-600">
                          <span className="font-bold text-slate-500">Statutory Basis:</span> {item.applicability_explanation}
                        </div>
                        <div className="text-slate-700 font-medium">
                          <span className="font-bold text-slate-500">Engine Evaluation:</span> {item.reason}
                        </div>
                        {item.observed_value && (
                          <div className="text-emerald-800 font-mono text-[10px] bg-emerald-50/70 p-1.5 rounded border border-emerald-100 mt-1">
                            <span className="font-bold text-emerald-700">Observed Label Text:</span> "{item.observed_value}"
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                          <div>
                            <span className="font-semibold">Rule Family:</span> {item.rule_family}
                          </div>
                          <div>
                            <span className="font-semibold">Database Version:</span> v{item.rule_database_version}
                          </div>
                          {item.amendment_version && (
                            <div className="col-span-2">
                              <span className="font-semibold">Statutory Gazette:</span> {item.amendment_version}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

