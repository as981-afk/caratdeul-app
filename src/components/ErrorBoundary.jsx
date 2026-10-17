import { Component, Fragment } from "react";
import { reportError } from "../utils/reportError";
import "./ErrorBoundary.css";

// Catches rendering errors anywhere below it and shows a friendly fallback
// instead of a blank screen.
//
// "Try again" bumps `resetKey`, which is applied as a `key` on the children:
// changing a key unmounts and remounts the whole subtree, so the crashing
// component actually re-initialises instead of re-rendering the same broken
// state. "Reload page" is the hard reset for everything else.
export default class ErrorBoundary extends Component {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError(error, { source: "render", ...info });
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, resetKey: s.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-boundary-logo">CARATFLIX</div>
            <h1 className="error-boundary-title">Something went wrong.</h1>
            <p className="error-boundary-text">
              An unexpected error interrupted the experience. Reload to get back
              to the diamond life.
            </p>
            <button className="error-boundary-btn" onClick={this.handleRetry}>
              Try again
            </button>
            <button className="error-boundary-btn error-boundary-btn--reload" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    // key remounts the subtree on retry so a crashing child starts fresh.
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
