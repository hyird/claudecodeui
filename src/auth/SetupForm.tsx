import { Loader2, Lock, ShieldCheck, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import type { AuthActionResult } from './types';
import AuthErrorAlert from './AuthErrorAlert';
import AuthInputField from './AuthInputField';
import AuthScreenLayout from './AuthScreenLayout';

type SetupFormProps = {
  onRegister: (username: string, password: string) => Promise<AuthActionResult>;
};

type SetupFormState = {
  username: string;
  password: string;
  confirmPassword: string;
};

const initialState: SetupFormState = {
  username: '',
  password: '',
  confirmPassword: '',
};

function validateSetupForm(formState: SetupFormState) {
  if (!formState.username.trim() || !formState.password || !formState.confirmPassword) {
    return '请填写所有字段。';
  }

  if (formState.username.trim().length < 3) {
    return '用户名至少需要 3 个字符。';
  }

  if (formState.password.length < 6) {
    return '密码至少需要 6 个字符。';
  }

  if (formState.password !== formState.confirmPassword) {
    return '两次输入的密码不一致。';
  }

  return '';
}

export default function SetupForm({ onRegister }: SetupFormProps) {
  const [formState, setFormState] = useState<SetupFormState>(initialState);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof SetupFormState, value: string) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage('');

      const validationError = validateSetupForm(formState);
      if (validationError) {
        setErrorMessage(validationError);
        return;
      }

      setIsSubmitting(true);
      const result = await onRegister(formState.username.trim(), formState.password);
      if (!result.success) {
        setErrorMessage(result.error);
      }
      setIsSubmitting(false);
    },
    [formState, onRegister],
  );

  return (
    <AuthScreenLayout
      title="欢迎使用 CloudCLI"
      description="创建账户后即可开始使用"
      footerText="这是单用户系统，只能创建一个账户。"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AuthInputField
          id="username"
          name="username"
          label="用户名"
          value={formState.username}
          onChange={(value) => updateField('username', value)}
          placeholder="设置用户名"
          isDisabled={isSubmitting}
          autoComplete="username"
          icon={User}
        />

        <AuthInputField
          id="password"
          name="password"
          label="密码"
          value={formState.password}
          onChange={(value) => updateField('password', value)}
          placeholder="创建密码"
          isDisabled={isSubmitting}
          type="password"
          autoComplete="new-password"
          icon={Lock}
        />

        <AuthInputField
          id="confirmPassword"
          name="confirmPassword"
          label="确认密码"
          value={formState.confirmPassword}
          onChange={(value) => updateField('confirmPassword', value)}
          placeholder="再次输入密码"
          isDisabled={isSubmitting}
          type="password"
          autoComplete="new-password"
          icon={ShieldCheck}
        />

        <p className="auth-hint">
          <ShieldCheck size={14} aria-hidden="true" />
          用户名至少 3 个字符，密码至少 6 个字符。
        </p>

        <AuthErrorAlert errorMessage={errorMessage} />

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="auth-spin" size={16} aria-hidden="true" />
              创建中...
            </>
          ) : (
            '创建账户'
          )}
        </button>
      </form>
    </AuthScreenLayout>
  );
}
