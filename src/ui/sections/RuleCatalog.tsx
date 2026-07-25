import { CATEGORY_LABELS, ruleRegistry } from '../../core';

export function RuleCatalog() {
  return (
    <div className="rule-catalog">
      {ruleRegistry.map((rule) => (
        <div className="rule-item" key={rule.id}>
          <h3>
            <span className="badge badge--rule">{rule.id}</span>
            {rule.name}
          </h3>
          <p>
            <span className="muted small">{CATEGORY_LABELS[rule.category]}</span>
            <br />
            {rule.description}
          </p>
        </div>
      ))}
    </div>
  );
}
