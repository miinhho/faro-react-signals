import { withFaroUserAction } from 'faro-react-signals';
import type { ReactNode } from 'react';

export type ButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

function BaseButton({ children, disabled, onClick, variant = 'secondary' }: ButtonProps) {
  return (
    <button className={`button ${variant}`} disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export const Button = withFaroUserAction(BaseButton, 'button.clicked', {
  getAttributes: (props) => ({
    component: 'Button',
    disabled: String(Boolean(props.disabled)),
    variant: typeof props.variant === 'string' ? props.variant : 'secondary',
  }),
});
