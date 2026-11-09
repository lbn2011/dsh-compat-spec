/**
 * Type declarations for dsh-compat-spec.
 *
 * Hand-written to match src/index.js. `tsc --noEmit` on a consumer project is the
 * intended check; this repository does not ship TypeScript tooling.
 */

/** Legacy revision; existing callers are never silently upgraded. */
export declare const PROTOCOL_VERSION: '0.1.0-draft.1';
/** Revision requiring a configuration contract. */
export declare const CONFIG_SCHEMA_PROTOCOL_VERSION: '0.2.0-draft.1';
export type SupportedProtocolVersion = typeof PROTOCOL_VERSION | typeof CONFIG_SCHEMA_PROTOCOL_VERSION;
export declare const SUPPORTED_PROTOCOL_VERSIONS: readonly [typeof PROTOCOL_VERSION, typeof CONFIG_SCHEMA_PROTOCOL_VERSION];

/** JSON data only; this type does not prove JSON Schema semantic correctness. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
/** Full JSON Schema 2020-12 intent, with only outer shape checked by this package. */
export type ConfigurationSchema = boolean | { [keyword: string]: JsonValue };

/** Resource category. A closed vocabulary, not a host registration API. */
export type ResourceKind = 'tool' | 'service';

/**
 * An author-supplied static label for a resource claim: any string satisfying
 * the label rules. Deliberately *not* a union or closed vocabulary, and not a
 * host, agent or session scope.
 */
export type ResourceScope = string;

export declare const RESOURCE_KINDS: readonly ResourceKind[];

/**
 * Codes this validator can actually emit. There is deliberately no code for
 * repeated object field names: a JavaScript value cannot carry one, so it is
 * unreachable through this API (see `spec/declaration-protocol.md` §8).
 */
export type IssueCode =
  | 'TYPE_MISMATCH'
  | 'MISSING_FIELD'
  | 'UNKNOWN_FIELD'
  | 'INVALID_VALUE'
  | 'THROWS';

export type Severity = 'error' | 'warning';

export declare const ISSUE_CODES: Readonly<Record<IssueCode, IssueCode>>;

/** `warning` is reserved; the validator currently emits only `error`. */
export declare const SEVERITIES: readonly Severity[];

/** A single validation problem. Always serializable to JSON. */
export interface DeclarationIssue {
  readonly code: IssueCode;
  /** Dot/bracket path; `''` for the declaration root. */
  readonly path: string;
  readonly message: string;
  readonly severity: Severity;
}

/** The frozen result of {@link validateDeclaration}. */
export interface ValidationResult {
  readonly valid: boolean;
  readonly issues: readonly DeclarationIssue[];
}

/** A declared managed-resource claim. Descriptive only. */
export interface ResourceClaim {
  kind: ResourceKind;
  name: string;
  /** Explicit static label; no default is applied and no host semantics are implied. */
  scope: ResourceScope;
}

/** Legacy author-supplied declaration. Kept legacy for source compatibility. */
export interface PluginDeclaration {
  schemaVersion: typeof PROTOCOL_VERSION;
  plugin: {
    /** Non-empty opaque identifier; no leading/trailing whitespace; no control characters. */
    id: string;
    /** Non-empty opaque label. No SemVer parsing, ordering or range matching is performed. */
    version: string;
  };
  capabilities: {
    required: string[];
    optional: string[];
  };
  /**
   * Required. May be empty; omitting it or passing `null` is invalid and is
   * never defaulted.
   */
  resources: ResourceClaim[];
}

/** New revision: explicit contract, with no default or implicit migration. */
export interface ConfigPluginDeclaration extends Omit<PluginDeclaration, 'schemaVersion'> {
  schemaVersion: typeof CONFIG_SCHEMA_PROTOCOL_VERSION;
  configSchema: ConfigurationSchema;
}

export type SupportedPluginDeclaration = PluginDeclaration | ConfigPluginDeclaration;

/**
 * Validate an author-supplied declaration envelope by exact schemaVersion.
 * Only configSchema's outer boolean/object shape is checked; success does not
 * prove schema semantic correctness, resolved references, dialect/format
 * support, or configuration-value validity. A separate 2020-12 engine is needed.
 *
 * **No-throw contract: JSON values only.** For any JSON value (anything
 * `JSON.parse` can produce) this returns a result and never throws.
 *
 * Arbitrary JavaScript objects are not covered. The implementation is
 * best-effort: it reads own property names and the values of known fields only,
 * and converts a throwing accessor on a known field into a `THROWS` issue. A
 * `Proxy` trap (`ownKeys`, `getOwnPropertyDescriptor`, `get`, `has`) that throws
 * can still propagate, because no trap interception is attempted.
 */
export declare function validateDeclaration(value: unknown): ValidationResult;

/**
 * Throwing envelope-only convenience wrapper. Does not assert embedded schema
 * or configuration-value validity. Callers choose to throw; the library does not.
 *
 * @throws A `TypeError` whose `name` is `'DeclarationValidationError'` and whose
 *   `issues` property holds the {@link ValidationResult} issues.
 */
export declare function assertValidDeclaration(value: unknown, label?: string): true;

/** An incomplete declaration skeleton: empty identifiers and empty `capabilities` lists. */
export declare function declarationTemplate(): PluginDeclaration;

/**
 * JSON Schema (draft 2020-12) for the legacy declaration envelope.
 *
 * The schema is a machine-readable mirror of the rules, not an executor: this
 * package bundles no JSON Schema validator, and two rules are not expressible
 * in JSON Schema — repeated object field names and cross-list disjointness of
 * `capabilities.required` / `capabilities.optional`. They are listed in the
 * schema's `$comment`; `validateDeclaration` enforces disjointness, while source
 * key repetition requires a text-level parser. Uniqueness of the
 * `(kind, name, scope)` triple is expressible: a resource entry has exactly
 * those three fields, so `resources` carries `uniqueItems: true`.
 */
export declare function declarationJsonSchema(): Record<string, unknown>;

/**
 * Fresh declaration-envelope schema for an explicit revision (no default).
 * New-revision configSchema checks only boolean/object shape, never full schema
 * semantics. The no-argument declarationJsonSchema() remains legacy.
 * @throws RangeError for an unsupported revision.
 */
export declare function declarationJsonSchemaForVersion(version: SupportedProtocolVersion): Record<string, unknown>;
