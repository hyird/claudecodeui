import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

type AuthInputFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  isDisabled: boolean;
  type?: 'text' | 'password';
  name?: string;
  autoComplete?: string;
  icon?: LucideIcon;
};

export default function AuthInputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  isDisabled,
  type = 'text',
  name,
  autoComplete,
  icon: Icon,
}: AuthInputFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === 'password';
  const resolvedType = isPasswordField && isPasswordVisible ? 'text' : type;

  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-wrap">
        {Icon && <Icon className="auth-input-icon" size={16} aria-hidden="true" />}
        <input
          id={id}
          type={resolvedType}
          name={name ?? id}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${Icon ? 'has-leading-icon' : ''} ${isPasswordField ? 'has-trailing-button' : ''}`}
          placeholder={placeholder}
          required
          disabled={isDisabled}
        />
        {isPasswordField && (
          <button
            type="button"
            className="auth-input-action"
            onClick={() => setIsPasswordVisible((previous) => !previous)}
            disabled={isDisabled}
            aria-label={isPasswordVisible ? '隐藏密码' : '显示密码'}
            title={isPasswordVisible ? '隐藏密码' : '显示密码'}
          >
            {isPasswordVisible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
