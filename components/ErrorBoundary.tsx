import { Component, ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getActiveColors } from '../contexts/ThemeContext';

interface Props { children: ReactNode }
interface State { hasError: boolean }

/**
 * Top-level error boundary so a single bad render can never white-screen the
 * whole app. Shows a minimal fallback with a "Try again" reset instead of a
 * blank page. Local/cloud data is untouched (it lives in the store, not here).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary] caught render error:', error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    const colors = getActiveColors();
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 }}>
        <Text style={{ fontSize: 40 }}>😕</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text1 }}>Something went wrong</Text>
        <Text style={{ fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 20 }}>
          The screen hit an unexpected error. Your data is safe.
        </Text>
        <TouchableOpacity onPress={this.reset}
          style={{ marginTop: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 26 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
