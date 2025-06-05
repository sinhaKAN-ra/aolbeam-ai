// Types for interaction limits
export type InteractionType = 'evaluate' | 'insight' | 'problem_generation';

export interface InteractionLimitBase {
  allowed: boolean;
  remaining: number;
  limit: number;
  isLoggedIn: boolean;
}

export interface InteractionLimitResult extends InteractionLimitBase {
  requiresLogin: boolean;
  requiresUpgrade: boolean;
  showLoginModal: boolean;
  showUpgradeModal: boolean;
}

// API response types
export interface InteractionCheckResponse extends InteractionLimitBase {
  showLoginModal: boolean;
  showUpgradeModal: boolean;
}

export interface InteractionLimitState extends InteractionLimitBase {
  requiresLogin: boolean;
  requiresUpgrade: boolean;
}

// Database types
export interface UserInteraction {
  id: string;
  user_id: string;
  interaction_type: InteractionType;
  created_at: string;
}

// Props for interaction limit components
export interface InteractionLimitProps {
  interactionType: InteractionType;
  children: (props: { onClick: () => Promise<boolean>; isLoading: boolean }) => React.ReactNode;
  onLimitReached?: () => void;
}

// Props for the interaction limit modal
export interface InteractionLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  limit: number;
  isLoggedIn: boolean;
}
