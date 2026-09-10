export interface EvaluationContext {
  package_context?: string; // 'RETAIL_PACKAGE', 'WHOLESALE_PACKAGE', etc.
  commodity?: string;
  commodity_category?: string; // 'GENERAL', 'PAN_MASALA', 'MEDICAL_DEVICE', etc.
  is_imported?: boolean;
  is_imported_package?: boolean;
  is_retail_package?: boolean;
  is_wholesale_package?: boolean;
  is_export_package?: boolean;
  wholesale_package?: boolean;
  chapter_ii_applies?: boolean;
  rule_6_applies?: boolean;
  rule_7_applies?: boolean;
  rule_24_applies?: boolean;
  package_is_sold_at_retail_in_india?: boolean;
  package_is_itself_retail_package?: boolean;
  offered_or_sold_in_india?: boolean;
  applicable_quantity_declaration_required?: boolean;
  date_declaration_trigger_applies?: boolean;
  commodity_may_become_unfit_for_human_consumption?: boolean;
  product_specific_law_requires_date?: boolean;
  dimensions_are_relevant?: boolean;
  unit_sale_price_exception?: boolean;
  rule_24_proviso_does_not_displace?: boolean;
  similar_declarations_required_under_other_law?: boolean;
  industrial_or_institutional_definition_satisfied?: boolean;
  package_bears_not_for_retail_sale?: boolean;
  specific_rule_26_clause_applies?: boolean;
  package_is_group_combination_or_multi_piece?: boolean;
  inner_package_is_retail_package?: boolean;
  package_structure?: string;
  qualifying_exception_conditions_met?: boolean;
  affixed_label_used_for_required_declarations?: boolean;
  actual_quantity_measured?: boolean;
  applicable_mpe_rule_resolved?: boolean;
  ecommerce_entity_sells_imported_product?: boolean;
  ecommerce_order?: boolean;
  loose_commodity_conditions_met?: boolean;
  is_electronic_product_or_qualifying_spare?: boolean;
  package_contains_medical_device?: boolean;
  historical_rule_5_logic_encountered?: boolean;
  transaction_observed?: boolean;
  applicable_retail_sale_price?: number | string | null;
  evaluate_rule3_scope_conditions?: boolean;
  aeo_tier?: number | null;
  bonded_warehouse_pathway?: boolean;
  inspection_date?: string | Date;
  [key: string]: unknown;
}

export interface ConditionEvaluationResult {
  satisfied: boolean;
  explanation: string;
}

export class RuleConditionEvaluator {
  /**
   * Evaluates a statutory condition string deterministically without eval().
   * Supports: AND, OR, ==, !=, >=, <=, >, <, in {A,B,C}.
   */
  public static evaluate(conditionStr: string, ctx: EvaluationContext): ConditionEvaluationResult {
    if (!conditionStr || conditionStr.trim() === '') {
      return { satisfied: true, explanation: 'Unconditional requirement' };
    }

    const trimmed = conditionStr.trim();

    // Handle top-level OR clauses
    const orClauses = this.splitByOperator(trimmed, ' OR ');
    if (orClauses.length > 1) {
      const results = orClauses.map((clause) => this.evaluateClause(clause, ctx));
      const anySatisfied = results.some((r) => r.satisfied);
      const explanation = results.map((r) => r.explanation).join(' OR ');
      return { satisfied: anySatisfied, explanation: `(${explanation})` };
    }

    return this.evaluateClause(trimmed, ctx);
  }

  private static evaluateClause(clause: string, ctx: EvaluationContext): ConditionEvaluationResult {
    // Handle top-level AND clauses
    const andClauses = this.splitByOperator(clause, ' AND ');
    const results = andClauses.map((subClause) => this.evaluateSimpleCondition(subClause.trim(), ctx));

    const allSatisfied = results.every((r) => r.satisfied);
    const explanations = results.map((r) => r.explanation).join(' AND ');
    return { satisfied: allSatisfied, explanation: explanations };
  }

  private static evaluateSimpleCondition(expr: string, ctx: EvaluationContext): ConditionEvaluationResult {
    // 1. IN operator: var in {A, B, C}
    const inMatch = expr.match(/^([a-zA-Z0-9_]+)\s+in\s+\{([^}]+)\}$/i);
    if (inMatch) {
      const varName = inMatch[1];
      const rawSet = inMatch[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      const val = ctx[varName];

      const valStr = val !== undefined && val !== null ? String(val) : '';
      const matched = rawSet.some((item) => item.toUpperCase() === valStr.toUpperCase());
      return {
        satisfied: matched,
        explanation: `${varName} [${valStr || 'none'}] ${matched ? '∈' : '∉'} {${rawSet.join(', ')}}`,
      };
    }

    // 2. Relational comparison operators: ==, !=, >=, <=, >, <
    const compMatch = expr.match(/^([a-zA-Z0-9_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (compMatch) {
      const varName = compMatch[1];
      const op = compMatch[2];
      const rawTarget = compMatch[3].trim();
      const ctxVal = ctx[varName];

      return this.compareValues(varName, op, rawTarget, ctxVal, ctx);
    }

    // 3. Fallback: single boolean variable (e.g. "chapter_ii_applies")
    const truthyVal = Boolean(ctx[expr]);
    return {
      satisfied: truthyVal,
      explanation: `${expr} is ${truthyVal}`,
    };
  }

  private static compareValues(
    varName: string,
    op: string,
    targetStr: string,
    ctxVal: unknown,
    ctx: EvaluationContext
  ): ConditionEvaluationResult {
    // Date comparison
    if (varName === 'inspection_date' || /^\d{4}-\d{2}-\d{2}$/.test(targetStr)) {
      const inspectionDate = ctx.inspection_date ? new Date(ctx.inspection_date) : new Date();
      const targetDate = new Date(targetStr);
      const inspTime = inspectionDate.getTime();
      const targetTime = targetDate.getTime();

      let ok = false;
      if (op === '>=') ok = inspTime >= targetTime;
      else if (op === '<=') ok = inspTime <= targetTime;
      else if (op === '>') ok = inspTime > targetTime;
      else if (op === '<') ok = inspTime < targetTime;
      else if (op === '==') ok = inspTime === targetTime;
      else if (op === '!=') ok = inspTime !== targetTime;

      return {
        satisfied: ok,
        explanation: `inspection_date (${inspectionDate.toISOString().split('T')[0]}) ${op} ${targetStr}`,
      };
    }

    // Null check
    if (targetStr === 'null') {
      const isNull = ctxVal === null || ctxVal === undefined;
      const ok = op === '==' ? isNull : op === '!=' ? !isNull : false;
      return {
        satisfied: ok,
        explanation: `${varName} ${op} null (value is ${ctxVal === null ? 'null' : String(ctxVal)})`,
      };
    }

    // Boolean check
    if (targetStr === 'true' || targetStr === 'false') {
      const targetBool = targetStr === 'true';
      const actualBool = Boolean(ctxVal);
      const ok = op === '==' ? actualBool === targetBool : actualBool !== targetBool;
      return {
        satisfied: ok,
        explanation: `${varName} (${actualBool}) ${op} ${targetBool}`,
      };
    }

    // Numeric comparison
    const targetNum = Number(targetStr);
    if (!isNaN(targetNum) && typeof ctxVal === 'number') {
      let ok = false;
      if (op === '==') ok = ctxVal === targetNum;
      else if (op === '!=') ok = ctxVal !== targetNum;
      else if (op === '>=') ok = ctxVal >= targetNum;
      else if (op === '<=') ok = ctxVal <= targetNum;
      else if (op === '>') ok = ctxVal > targetNum;
      else if (op === '<') ok = ctxVal < targetNum;
      return {
        satisfied: ok,
        explanation: `${varName} (${ctxVal}) ${op} ${targetNum}`,
      };
    }

    // String literal comparison
    const cleanTarget = targetStr.replace(/^['"]|['"]$/g, '').trim();
    const actualStr = ctxVal !== undefined && ctxVal !== null ? String(ctxVal).trim() : '';
    const ok = op === '==' ? actualStr.toUpperCase() === cleanTarget.toUpperCase() : actualStr.toUpperCase() !== cleanTarget.toUpperCase();

    return {
      satisfied: ok,
      explanation: `${varName} (${actualStr || 'empty'}) ${op} '${cleanTarget}'`,
    };
  }

  private static splitByOperator(str: string, op: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i <= str.length - op.length; i++) {
      const char = str[i];
      if (char === '{' || char === '(') depth++;
      else if (char === '}' || char === ')') depth--;

      if (depth === 0 && str.substring(i, i + op.length) === op) {
        parts.push(str.substring(start, i));
        start = i + op.length;
        i += op.length - 1;
      }
    }
    parts.push(str.substring(start));
    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
  }
}

