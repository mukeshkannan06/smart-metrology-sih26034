import { IRule } from '../../models/Rule';
import { DeclarationExtraction } from '../../ai/aiProvider.interface';
import { EvaluationContext } from './RuleConditionEvaluator';
import { ValidationResultOutcome } from '../../models/RuleEvaluation';

export interface ValidationParams {
  rule: IRule;
  observation: DeclarationExtraction | null;
  context: EvaluationContext;
  allObservations: DeclarationExtraction[];
}

export interface ValidationResult {
  outcome: ValidationResultOutcome;
  reason: string;
  requiresInspectorReview: boolean;
  observedValue?: string | null;
  normalizedValue?: string | null;
}

export type ValidatorFunction = (params: ValidationParams) => ValidationResult;

export class RuleValidatorRegistry {
  private static registry: Map<string, ValidatorFunction> = new Map();

  static {
    this.registerDefaults();
  }

  public static register(name: string, fn: ValidatorFunction): void {
    this.registry.set(name, fn);
  }

  public static execute(name: string, params: ValidationParams): ValidationResult {
    const fn = this.registry.get(name);
    if (!fn) {
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: `Unregistered validation function '${name}'. Requires Inspector review.`,
      };
    }
    try {
      return fn(params);
    } catch (err: unknown) {
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: `Validator error: ${err instanceof Error ? err.message : 'Unknown validation exception'}`,
      };
    }
  }

  private static registerDefaults(): void {
    // 1. Generic Commodity Name
    this.register('validate_commodity_identity', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Common/generic commodity name declaration required under ${rule.rule_reference} was not observed on the principal display panel.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Commodity name '${observation.normalizedValue || observation.rawValue}' observed on package label.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 2. Responsible Entity Identity
    this.register('validate_responsible_entity_identity', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Manufacturer/packer/importer name and complete address required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Responsible entity details observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 3. Country of Origin
    this.register('validate_country_of_origin', ({ observation, rule, context }) => {
      if (context.is_imported || context.package_context === 'IMPORTED_PACKAGE') {
        if (!observation || observation.state === 'NOT_DETECTED') {
          return {
            outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
            requiresInspectorReview: true,
            reason: `Mandatory Country of Origin declaration for imported package under ${rule.rule_reference} was not observed.`,
          };
        }
        return {
          outcome: ValidationResultOutcome.PASS,
          requiresInspectorReview: false,
          reason: `Country of origin observed: '${observation.normalizedValue || observation.rawValue}'.`,
          observedValue: observation.rawValue,
          normalizedValue: observation.normalizedValue,
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Country of Origin is specifically mandatory for imported packages; package context is domestic.',
      };
    });

    // 4. Net Quantity Representation
    this.register('validate_quantity_representation', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Net quantity declaration required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Net quantity declaration observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 5. Maximum Retail Price (MRP)
    this.register('validate_mrp', ({ observation, rule, context }) => {
      if (context.package_context === 'WHOLESALE_PACKAGE') {
        return {
          outcome: ValidationResultOutcome.NOT_APPLICABLE,
          requiresInspectorReview: false,
          reason: 'Wholesale packages are not required to bear retail MRP under Rule 24 unless the outer package is itself sold at retail.',
        };
      }
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Retail sale price (MRP) declaration required under ${rule.rule_reference} was not observed on the retail package.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `MRP declaration observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 6. Manufacture / Pack / Import Date
    this.register('validate_date_declaration', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Month and year of manufacture/pack/import required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Manufacture/pack/import date observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 7. Best Before / Expiry
    this.register('validate_date_requirement', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: `Best-before/expiry declaration is conditional on commodity perishability/food safety law. No expiry detected; verify if required.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Best-before/expiry date observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 8. Consumer Care Details
    this.register('validate_consumer_care', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Consumer care / complaint contact details required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Consumer care contact information observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 9. Dimensions
    this.register('validate_dimensions', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: `Dimensions declaration is required when relevant to commodity size. Verify whether dimensions are applicable for this commodity.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Dimensions observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 10. Unit Sale Price
    this.register('validate_unit_sale_price', ({ observation, rule, context }) => {
      if (context.unit_sale_price_exception || context.package_structure === 'COMBINATION') {
        return {
          outcome: ValidationResultOutcome.EXEMPT,
          requiresInspectorReview: false,
          reason: 'Unit sale price is exempt for qualifying combination/group/multi-piece packages under Rule 6(11) proviso.',
        };
      }
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: `Unit sale price declaration under ${rule.rule_reference} was not detected. Verify if package net quantity exceeds statutory threshold.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Unit sale price observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 11. Wholesale Responsible Entity
    this.register('validate_wholesale_entity', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Wholesale responsible entity name/address required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Wholesale entity details observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 12. Wholesale Commodity Identity
    this.register('validate_wholesale_identity', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Wholesale commodity identity required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Wholesale commodity identity observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 13. Wholesale Quantity or Count
    this.register('validate_wholesale_quantity_or_count', ({ observation, rule }) => {
      if (!observation || observation.state === 'NOT_DETECTED') {
        return {
          outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
          requiresInspectorReview: true,
          reason: `Wholesale total package count or net quantity required under ${rule.rule_reference} was not observed.`,
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: `Wholesale package count/net quantity observed: '${observation.normalizedValue || observation.rawValue}'.`,
        observedValue: observation.rawValue,
        normalizedValue: observation.normalizedValue,
      };
    });

    // 14. Wholesale MRP Suppression (Critical Safety Principle)
    this.register('suppress_wholesale_mrp', () => {
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'MRP is NOT a Rule 24 wholesale-package requirement. Suppressed to prevent false non-compliance flags on wholesale distribution packages.',
      };
    });

    // 15. Export Domestic Sale Evaluation
    this.register('evaluate_export_domestic_sale', ({ context }) => {
      if (context.offered_or_sold_in_india) {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: 'Export package offered/sold domestically in India requires repacking/relabeling in accordance with Chapter II under Rule 25.',
        };
      }
      return {
        outcome: ValidationResultOutcome.EXEMPT,
        requiresInspectorReview: false,
        reason: 'Export package intended exclusively for export is exempt from Chapter II domestic retail declarations under Rule 25.',
      };
    });

    // 16. Industrial / Institutional Scope Evaluation
    this.register('evaluate_industrial_institutional_scope', ({ context }) => {
      if (context.package_context === 'INDUSTRIAL_INSTITUTIONAL_PACKAGE' || context.industrial_or_institutional_definition_satisfied) {
        return {
          outcome: ValidationResultOutcome.SCOPE_EXCLUDED,
          requiresInspectorReview: true,
          reason: "Satisfies statutory industrial/institutional package definition under Rule 2(bb)/(bc). Excluded from Chapter II retail declaration requirements provided package bears 'Not for retail sale'.",
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Package is not an industrial or institutional package; standard Chapter II rules apply.',
      };
    });

    // 17. Rule 26 Statutory Exemptions
    this.register('evaluate_rule_26_exemption', ({ context }) => {
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: 'Evaluate applicable Rule 26 statutory exemption clauses (e.g. net weight <= 10g/10ml, agricultural produce, fast food items) before concluding non-compliance.',
      };
    });

    // 18. Inner Retail Packages in Grouped Packages (Rule 4(2))
    this.register('validate_inner_retail_packages', ({ context }) => {
      if (context.package_is_group_combination_or_multi_piece) {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: 'Qualifying grouped/promotional package: individual inner retail packages must independently comply with Rule 6 requirements.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Package is a single pre-packaged unit; group package structure rules not applicable.',
      };
    });

    // 19. Importer Affixed Label (Rule 6(9))
    this.register('allow_importer_affixed_label', ({ context }) => {
      if (context.is_imported || context.package_context === 'IMPORTED_PACKAGE') {
        return {
          outcome: ValidationResultOutcome.PASS,
          requiresInspectorReview: false,
          reason: 'Affixed label on imported package is an authorized mechanism for making required declarations under Rule 6(9).',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Affixed label permission under Rule 6(9) is specifically applicable to imported packages.',
      };
    });

    // 20. Maximum Permissible Error (MPE) Comparison
    this.register('compare_measured_quantity_to_mpe', ({ observation }) => {
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: 'Physical quantity verification requires calibrated standard measurement comparison with First Schedule MPE tables. Package artwork alone cannot determine physical measurement compliance.',
      };
    });

    // 21. Display Legibility (Rule 7)
    this.register('evaluate_display_legibility', () => {
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: 'Rule 7 numeral and letter font height relative to Principal Display Panel area requires physical inspection verification.',
      };
    });

    // 22. E-Commerce Country of Origin Filter (Rule 6(10A))
    this.register('validate_ecommerce_coo_filter', ({ context }) => {
      if (context.ecommerce_entity_sells_imported_product) {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: 'Platform-level digital obligation under G.S.R. 128(E) requires searchable/sortable country-of-origin filter for e-commerce imported products.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Not a physical package requirement; applies to digital e-commerce marketplace platforms.',
      };
    });

    // 23. Future E-Commerce Filter (Rule 6(10A) 2027)
    this.register('validate_future_ecommerce_coo_filter', () => {
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Future statutory amendment under G.S.R. 312(E) effective from 01 July 2027. Inactive for current inspections.',
      };
    });

    // 24. Pan Masala Rule 26(a) Exemption Carveout
    this.register('disable_pan_masala_rule_26a_exemption', ({ context }) => {
      if (context.commodity_category === 'PAN_MASALA' || /pan\s*masala/i.test(context.commodity || '')) {
        return {
          outcome: ValidationResultOutcome.SCOPE_EXCLUDED,
          requiresInspectorReview: true,
          reason: 'Under G.S.R. 881(E) effective 01 Feb 2026, Rule 26(a) package weight exemptions DO NOT apply to pan masala. Full declaration requirements govern.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Pan masala carveout under Rule 26(a) is not applicable to general commodities.',
      };
    });

    // 25. Medical Device Overlay Routing
    this.register('route_to_mdr_overlay', ({ context }) => {
      if (context.commodity_category === 'MEDICAL_DEVICE' || context.package_contains_medical_device) {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: 'Governed by G.S.R. 778(E) 2025 amendment: medical device declaration placement and numeral/letter dimensions route to Medical Devices Rules, 2017.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Package does not contain a medical device; standard LMPC 2011 provisions apply.',
      };
    });

    // 26. Historical Rule 5 Guard
    this.register('block_obsolete_rule5_enforcement', () => {
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: true,
        reason: 'Historical Rule 5/Second Schedule logic cannot be auto-enforced. Must be established from current legal source.',
      };
    });

    // 27. Sale Above MRP Enforcement (Rule 18(2))
    this.register('validate_sale_price_not_above_mrp', ({ observation, context }) => {
      if (!context.transaction_observed || context.applicable_retail_sale_price == null) {
        return {
          outcome: ValidationResultOutcome.NOT_APPLICABLE,
          requiresInspectorReview: false,
          reason: 'Rule 18(2) sale-above-MRP is an in-person transaction enforcement check requiring an observed sales receipt or price charged. Distinct from package MRP declaration check.',
        };
      }
      return {
        outcome: ValidationResultOutcome.REVIEW_REQUIRED,
        requiresInspectorReview: true,
        reason: 'Observed retail selling price must not exceed declared MRP on package.',
      };
    });

    // 28. Rule 24 Proviso (Other Law Wholesale Substitution)
    this.register('evaluate_rule24_proviso', ({ context }) => {
      if (context.similar_declarations_required_under_other_law) {
        return {
          outcome: ValidationResultOutcome.EXEMPT,
          requiresInspectorReview: true,
          reason: 'Under Rule 24 proviso, wholesale declarations are substituted by similar declarations required under another applicable law.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Rule 24 proviso not triggered.',
      };
    });

    // 29. Rule 3 Scope Evaluation
    this.register('evaluate_rule3_scope', ({ context }) => {
      if (context.package_context === 'INDUSTRIAL_INSTITUTIONAL_PACKAGE') {
        return {
          outcome: ValidationResultOutcome.SCOPE_EXCLUDED,
          requiresInspectorReview: true,
          reason: 'Rule 3 scope exclusion: package excluded from Chapter II retail declarations provided conditions under Rule 3(c) are met.',
        };
      }
      return {
        outcome: ValidationResultOutcome.PASS,
        requiresInspectorReview: false,
        reason: 'Package falls within Chapter II retail scope under Rule 3.',
      };
    });

    // 30. E-Commerce Loose Commodity Exception
    this.register('evaluate_ecommerce_loose_commodity_exception', ({ context }) => {
      if (context.ecommerce_order && context.loose_commodity_conditions_met) {
        return {
          outcome: ValidationResultOutcome.EXEMPT,
          requiresInspectorReview: true,
          reason: 'Qualifying loose commodity ordered via e-commerce: reduced declaration treatment applies under 2023 amendment.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Standard packaged commodity; loose commodity e-commerce exception not applicable.',
      };
    });

    // 31. Unit Sale Price Exception
    this.register('evaluate_unit_sale_price_exception', ({ context }) => {
      if (context.package_structure === 'COMBINATION' || context.package_structure === 'GROUP') {
        return {
          outcome: ValidationResultOutcome.EXEMPT,
          requiresInspectorReview: false,
          reason: 'Unit sale price is not required for qualifying combination/group packages under Rule 6(11) proviso.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Unit sale price exception condition not satisfied.',
      };
    });

    // 32. Electronic Product Manufacture Date
    this.register('validate_electronic_product_date', ({ observation, context }) => {
      if (context.commodity_category === 'ELECTRONIC_PRODUCT' || context.is_electronic_product_or_qualifying_spare) {
        if (!observation || observation.state === 'NOT_DETECTED') {
          return {
            outcome: ValidationResultOutcome.POTENTIAL_VIOLATION,
            requiresInspectorReview: true,
            reason: 'Manufacture date required on electronic product under Rule 6(1)(d) 2023 amendment was not observed.',
          };
        }
        return {
          outcome: ValidationResultOutcome.PASS,
          requiresInspectorReview: false,
          reason: `Electronic product manufacture date observed: '${observation.normalizedValue || observation.rawValue}'.`,
          observedValue: observation.rawValue,
          normalizedValue: observation.normalizedValue,
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Product is not classified as an electronic product or spare part.',
      };
    });

    // 33. AEO Import Facilitation 2026
    this.register('evaluate_aeo_import_facilitation', ({ context }) => {
      if (context.bonded_warehouse_pathway || (context.aeo_tier && context.aeo_tier >= 2)) {
        return {
          outcome: ValidationResultOutcome.REVIEW_REQUIRED,
          requiresInspectorReview: true,
          reason: 'AEO Tier-2/3 bonded warehouse import facilitation pathway under 2026 Third Amendment: requires import documentation review.',
        };
      }
      return {
        outcome: ValidationResultOutcome.NOT_APPLICABLE,
        requiresInspectorReview: false,
        reason: 'Standard import pathway; AEO bonded warehouse facilitation not claimed.',
      };
    });
  }
}

