import { AlertCircle } from 'lucide-react';

type AuthErrorAlertProps = {
  errorMessage: string;
};

export default function AuthErrorAlert({ errorMessage }: AuthErrorAlertProps) {
  if (!errorMessage) {
    return null;
  }

  return (
    <div className="auth-error" role="alert">
      <AlertCircle size={16} aria-hidden="true" />
      <p>{errorMessage}</p>
    </div>
  );
}
