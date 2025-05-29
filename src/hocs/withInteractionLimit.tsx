import { useState } from 'react';
import { useInteractionLimit } from '@/hooks/useInteractionLimit';
import { InteractionLimitModal } from '@/components/InteractionLimitModal';
import type { InteractionType, InteractionLimitResult } from '@/types/interaction';

interface WithInteractionLimitProps {
  interactionType: InteractionType;
  children: (props: { 
    onClick: () => Promise<boolean>; 
    isLoading: boolean;
    remaining?: number;
    limit?: number;
  }) => React.ReactNode;
  onLimitReached?: (result: InteractionLimitResult) => void;
}

export function withInteractionLimit<T extends object>(
  WrappedComponent: React.ComponentType<T>
) {
  return function WithInteractionLimit({
    interactionType,
    children,
    onLimitReached,
    ...props
  }: WithInteractionLimitProps & T) {
    const [showModal, setShowModal] = useState(false);
    const [interactionState, setInteractionState] = useState<{
      remaining: number;
      limit: number;
      isLoggedIn: boolean;
    } | null>(null);

    const { requireInteraction, isLoading } = useInteractionLimit();

    const handleAction = async (): Promise<boolean> => {
    const result = await requireInteraction(interactionType);
    
    if (!result.allowed) {
      if (result.requiresLogin || result.requiresUpgrade) {
        setInteractionState({
          remaining: result.remaining ?? 0,
          limit: result.limit ?? 0,
          isLoggedIn: !result.requiresLogin
        });
        setShowModal(true);
      }
      onLimitReached?.(result);
      return false;
    }
    
    return true;
  };

    return (
      <>
        <WrappedComponent {...(props as T)}>
          {({ onClick, isLoading: childLoading }: any) =>
            children({
              onClick: async () => {
                const allowed = await handleAction();
                if (allowed) {
                  return onClick();
                }
                return false;
              },
              isLoading: isLoading || childLoading,
            })
          }
        </WrappedComponent>
        
        <InteractionLimitModal
          open={showModal}
          onOpenChange={setShowModal}
          remaining={interactionState?.remaining ?? 0}
          limit={interactionState?.limit ?? 0}
          isLoggedIn={interactionState?.isLoggedIn ?? false}
        />
      </>
    );
  };
}
