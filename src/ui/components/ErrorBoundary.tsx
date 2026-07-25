import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Prevents an unexpected render error from taking down the whole page.
 * It deliberately does NOT log the error object, which could otherwise contain
 * fragments of the user's data.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally empty: we do not forward errors anywhere (privacy-first).
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="container section">
          <div className="card stack" role="alert">
            <h2>發生非預期的錯誤 Something went wrong</h2>
            <p className="muted">
              工具遇到未預期的問題。您的檔案並未離開這台裝置。請重新整理頁面後再試一次。
              <br />
              The tool hit an unexpected problem. Your file never left this device. Please reload and
              try again.
            </p>
            <div>
              <button type="button" className="btn btn--primary" onClick={this.handleReset}>
                重試 Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
