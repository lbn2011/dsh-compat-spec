/**
 * Types for the admission evidence lane (`admission-evidence/0.1-draft.1`).
 *
 * These declarations describe the *draft* validator contract in
 * `spec/admission-evidence.md` §4–§6.7. A `valid: true` result means the document
 * is internally consistent and nothing more: it is not evidence that anything was
 * admitted, not a host-acceptance fact, and not authentication of the producer.
 */

/** The single accepted `schemaVersion` literal. */
export declare const VERSION: 'admission-evidence/0.1-draft.1';

/** The four status words, in the order the spec introduces them (§5). */
export declare const CASE_STATUSES: readonly ['passed', 'refused', 'failed', 'not-run'];

/** The closed diagnostic codes, in emission order within one location (§6.7). */
export declare const ISSUE_CODE_ORDER: readonly [
  'INVALID_INPUT',
  'NOT_INSPECTABLE',
  'UNEXPECTED_FIELD',
  'MISSING_FIELD',
  'WRONG_TYPE',
  'EMPTY_STRING',
  'INVALID_STRING_FORMAT',
  'SPARSE_ARRAY',
  'INVALID_SCHEMA_VERSION',
  'INVALID_COMMIT',
  'INVALID_COORDINATION_VALUE',
  'INVALID_LABEL',
  'FORBIDDEN_FIELD',
  'UNKNOWN_CASE_ID',
  'DUPLICATE_CASE_ID',
  'MISSING_REQUIRED_CASE',
  'UNKNOWN_ASSERTION_ID',
  'DUPLICATE_ASSERTION_ID',
  'MISSING_ASSERTION',
  'INVALID_STATUS',
  'STATUS_NOT_ALLOWED_FOR_CASE',
  'STATUS_ASSERTION_MISMATCH',
  'NOT_RUN_REQUIRES_LIMITATION',
];

/** One closed diagnostic code. */
export type AdmissionIssueCode = (typeof ISSUE_CODE_ORDER)[number];

/** The closed case catalog, in catalog order (§6.1). */
export declare const CASE_IDS: readonly [
  'admission-admitted',
  'admission-refused-conflict',
  'admission-activation-throw',
  'admission-cleanup-failure',
  'admission-lease-state',
  'admission-tuple-shape',
  'admission-remount-same-coordinator',
  'admission-visibility',
];

/** One catalog case id. */
export type AdmissionCaseId = (typeof CASE_IDS)[number];

/** The four cases a valid document must report (§6.1, §6.5). */
export declare const REQUIRED_CASE_IDS: readonly [
  'admission-admitted',
  'admission-refused-conflict',
  'admission-activation-throw',
  'admission-cleanup-failure',
];

/** Exact assertion sets per case, in the order §6.2 lists them. */
export declare const ASSERTION_IDS: Readonly<{
  'admission-admitted': readonly [
    'reservation-precedes-activation',
    'activation-ran-once',
    'caller-effect-observed-once',
    'close-fulfilled',
    'close-returns-same-promise',
    'claim-released-after-close',
    'disposer-ran-exactly-once',
  ];
  'admission-refused-conflict': readonly [
    'refusal-code-conflict',
    'refusal-before-any-callback',
    'contender-activation-ran-zero',
    'contender-effect-ran-zero',
    'holder-claim-still-held',
  ];
  'admission-activation-throw': readonly [
    'activation-entered-then-threw',
    'registered-rollback-callbacks-settled',
    'rethrow-same-error-identity',
    'rollback-disposer-ran-exactly-once',
    'claim-quarantined-after-throw',
  ];
  'admission-cleanup-failure': readonly [
    'close-rejected',
    'close-rejection-code-cleanup-failed',
    'disposer-ran-exactly-once',
    'claim-not-released-after-failed-cleanup',
    'later-reservation-conflicts',
  ];
  'admission-lease-state': readonly [
    'release-idempotent',
    'stale-release-frees-nothing',
    'release-quarantined-refused',
    'quarantine-released-refused',
  ];
  'admission-tuple-shape': readonly [
    'refuses-extra-own-key',
    'refuses-non-own-field',
    'refuses-accessor-field',
    'refuses-untrimmed-name',
    'refuses-untrimmed-scope',
    'refuses-wrong-kind',
    'refuses-empty-string',
  ];
  'admission-remount-same-coordinator': readonly [
    'same-coordinator-after-remount',
    'unreleased-claim-still-held',
  ];
  'admission-visibility': readonly ['coordinator-object-identical', 'scope-visibility-recorded'];
}>;

/** Coordinator identity states (§4). */
export declare const COORDINATOR_IDENTITY_VALUES: readonly [
  'observed-identical',
  'different',
  'not-compared',
];

/** How the coordinator reached the participant — provenance, never authentication (§4). */
export declare const PROVISIONING_VALUES: readonly ['caller-supplied', 'not-determined'];

/** Visibility scope states (§4). */
export declare const SCOPE_VISIBILITY_VALUES: readonly [
  'same-visibility-scope',
  'different-scope',
  'not-determined',
];

/** A status word. */
export type AdmissionStatus = (typeof CASE_STATUSES)[number];

/** One catalog entry, as data. */
export interface AdmissionCaseSpec {
  readonly id: AdmissionCaseId;
  readonly required: boolean;
  readonly expectedOutcome: 'completion' | 'refusal';
  readonly supportedRules: readonly string[];
  readonly allowedStatuses: readonly AdmissionStatus[];
  readonly assertionIds: readonly string[];
}

/** The catalog as data: one frozen entry per case id, in catalog order. */
export declare const CASE_CATALOG: readonly AdmissionCaseSpec[];

/** One diagnostic. `path` is a location and never carries a value (§6.6). */
export interface AdmissionIssue {
  readonly code: AdmissionIssueCode;
  readonly path: string;
}

/** Per-case summary. `failedAssertions` is unique and in catalog order. */
export interface AdmissionCaseSummary {
  readonly id: AdmissionCaseId;
  readonly status: AdmissionStatus;
  readonly assertionCount: number;
  readonly failedAssertions: readonly string[];
  readonly limitations: readonly string[];
}

/** What a valid document summarises to. */
export interface AdmissionSummary {
  readonly schemaVersion: 'admission-evidence/0.1-draft.1';
  /** Literal `false`: this lane authenticates nothing (§7). */
  readonly certification: false;
  readonly coverage: {
    readonly required: readonly string[];
    readonly present: readonly string[];
    readonly unknown: readonly string[];
  };
  readonly cases: readonly AdmissionCaseSummary[];
  readonly limitations: readonly string[];
}

/** The result of a successful validation. */
export interface AdmissionValidResult {
  readonly valid: true;
  readonly issues: readonly [];
  readonly summary: AdmissionSummary;
}

/** The result of a failed validation: no summary, never a partial one. */
export interface AdmissionInvalidResult {
  readonly valid: false;
  readonly issues: readonly AdmissionIssue[];
  readonly summary?: undefined;
}

export type AdmissionResult = AdmissionValidResult | AdmissionInvalidResult;

/**
 * Validates one admission evidence document.
 *
 * Synchronous, pure, deterministic, and non-throwing for values produced by
 * `JSON.parse`. It gives no guarantee against a hostile object graph: an own
 * accessor or proxy trap can run code before validation is reached (§6.6).
 */
export declare function validateAdmissionEvidence(value: unknown): AdmissionResult;
