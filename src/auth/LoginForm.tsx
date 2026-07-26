import { Loader2, Lock, User } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import type { AuthActionResult } from './types';
import AuthErrorAlert from './AuthErrorAlert';
import AuthInputField from './AuthInputField';
import AuthScreenLayout from './AuthScreenLayout';

type LoginFormProps = {
  onLogin: (username: string, password: string) => Promise<AuthActionResult>;
};

type LoginFormState = {
  username: string;
  password: string;
};

const initialState: LoginFormState = {
  username: '',
  password: '',
};

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [formState, setFormState] = useState<LoginFormState>(initialState);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof LoginFormState, value: string) => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setErrorMessage('');

      if (!formState.username.trim() || !formState.password) {
        setErrorMessage('请填写用户名和密码。');
        return;
      }

      setIsSubmitting(true);
      const result = await onLogin(formState.username.trim(), formState.password);
      if (!result.success) {
        setErrorMessage(result.error);
      }
      setIsSubmitting(false);
    },
    [formState.password, formState.username, onLogin],
  );

  return (
    <AuthScreenLayout
      title="欢迎回来"
      description="登录您的 Cloud Terminal 账户"
      footerText="输入您的凭据以访问 Cloud Terminal"
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AuthInputField
          id="username"
          label="用户名"
          value={formState.username}
          onChange={(value) => updateField('username', value)}
          placeholder="输入您的用户名"
          isDisabled={isSubmitting}
          autoComplete="username"
          icon={User}
        />

        <AuthInputField
          id="password"
          label="密码"
          value={formState.password}
          onChange={(value) => updateField('password', value)}
          placeholder="输入您的密码"
          isDisabled={isSubmitting}
          type="password"
          autoComplete="current-password"
          icon={Lock}
        />

        <AuthErrorAlert errorMessage={errorMessage} />

        <button type="submit" className="auth-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="auth-spin" size={16} aria-hidden="true" />
              登录中...
            </>
          ) : (
            '登录'
          )}
        </button>
      </form>
    </AuthScreenLayout>
  );
}
