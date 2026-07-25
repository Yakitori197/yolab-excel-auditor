import { useId } from 'react';
import type { RoiInputs, RoiResult } from '../../core';
import { formatMoney, formatNumber } from '../format';

interface Props {
  inputs: RoiInputs;
  onChange: (inputs: RoiInputs) => void;
  result: RoiResult;
}

interface FieldConfig {
  key: keyof RoiInputs;
  label: string;
  suffix?: string;
  min: number;
  max?: number;
  step?: number;
}

const FIELDS: FieldConfig[] = [
  { key: 'timesPerWeek', label: '每週整理次數 Times / week', min: 0, step: 1 },
  { key: 'minutesPerTime', label: '每次耗費分鐘 Minutes / time', min: 0, step: 5 },
  { key: 'people', label: '執行人數 People', min: 0, step: 1 },
  { key: 'hourlyCost', label: '每小時人力成本 Hourly cost（元）', min: 0, step: 50 },
  { key: 'automatablePercent', label: '預估可自動化比例 Automatable %', min: 0, max: 100, step: 5 },
];

export function RoiCalculator({ inputs, onChange, result }: Props) {
  const groupId = useId();

  function update(key: keyof RoiInputs, raw: string): void {
    const value = Number(raw);
    onChange({ ...inputs, [key]: Number.isFinite(value) ? value : 0 });
  }

  return (
    <div className="roi-grid">
      <form className="roi-inputs" aria-labelledby={`${groupId}-title`} onSubmit={(e) => e.preventDefault()}>
        <h3 id={`${groupId}-title`} className="visually-hidden">
          自動化效益估算輸入
        </h3>
        {FIELDS.map((field) => {
          const id = `${groupId}-${field.key}`;
          return (
            <div className="field" key={field.key}>
              <label htmlFor={id}>{field.label}</label>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                step={field.step}
                value={String(inputs[field.key])}
                onChange={(e) => update(field.key, e.target.value)}
              />
            </div>
          );
        })}
      </form>

      <div className="roi-results" aria-live="polite">
        <div className="result-tile">
          <span>每月人工工時 Monthly hours</span>
          <strong>{formatNumber(result.monthlyHours)} 小時</strong>
        </div>
        <div className="result-tile">
          <span>每月估算成本 Monthly cost</span>
          <strong>{formatMoney(result.monthlyCost)} 元</strong>
        </div>
        <div className="result-tile result-tile--accent">
          <span>自動化後每月可省 Time saved</span>
          <strong>{formatNumber(result.savedHours)} 小時</strong>
        </div>
        <div className="result-tile result-tile--accent">
          <span>自動化後每月可省 Cost saved</span>
          <strong>{formatMoney(result.savedCost)} 元</strong>
        </div>
        <p className="small muted" style={{ margin: '0.3rem 0 0' }}>
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
