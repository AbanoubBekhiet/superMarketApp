import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { STRINGS } from '@/constants/strings';
import { colors } from '@/theme/tokens';
import { Button } from './Button';

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="gap-md px-page-x py-base">
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          className="h-24 rounded-lg bg-surface-card border border-outline-subtle p-base justify-between opacity-70"
        >
          <View className="h-4 w-32 rounded bg-surface-subtle" />
          <View className="h-3 w-48 rounded bg-surface-subtle" />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  title = STRINGS.common.emptyTitle,
  subtitle = STRINGS.common.emptySubtitle,
  actionLabel,
  onAction,
}: {
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-center justify-center py-2xl px-xl gap-sm">
      <View className="w-14 h-14 rounded-full bg-mint-surface items-center justify-center">
        <Inbox size={26} color={colors.primary} />
      </View>
      <Text className="font-headline text-title-md text-on-surface text-center">{title}</Text>
      <Text className="font-body text-body-md text-on-surface-subtle text-center">{subtitle}</Text>
      {actionLabel && onAction ? (
        <Button variant="mint" size="sm" label={actionLabel} onPress={onAction} className="mt-sm" />
      ) : null}
    </View>
  );
}

export function ErrorState({
  title = STRINGS.common.errorTitle,
  message = STRINGS.common.errorMessage,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View className="bg-surface-card border border-outline-subtle rounded-lg p-xl mx-page-x my-base items-center gap-md">
      <View className="w-12 h-12 rounded-full bg-error-container items-center justify-center">
        <AlertTriangle size={24} color={colors.onErrorContainer} />
      </View>
      <Text className="font-headline text-title-md text-on-surface text-center">{title}</Text>
      <Text className="font-body text-body-md text-on-surface-muted text-center">{message}</Text>
      {onRetry ? (
        <Button variant="mint" size="sm" onPress={onRetry}>
          <RefreshCw size={16} color={colors.onMintSurface} />
          <Text className="font-label text-label-md text-on-mint-surface">
            {STRINGS.common.retry}
          </Text>
        </Button>
      ) : null}
    </View>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Mobile ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-surface items-center justify-center p-base">
          <ErrorState onRetry={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}
