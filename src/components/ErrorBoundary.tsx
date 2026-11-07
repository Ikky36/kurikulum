import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw, Home, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] w-full flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-2xl border border-destructive/20 shadow-lg p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-foreground">
                {this.props.fallbackTitle || "Terjadi Kendala Memuat Halaman"}
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {this.props.fallbackDescription ||
                  "Aplikasi mendeteksi gangguan saat menampilkan tampilan ini. Silakan coba muat ulang halaman atau periksa kembali tautan Anda."}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border"
              >
                <Home className="w-3.5 h-3.5" />
                Beranda
              </button>
            </div>

            <div className="pt-2 border-t">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <span>Detail Teknis</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 text-left bg-muted/60 p-2.5 rounded-lg border text-[11px] font-mono text-destructive space-y-1 overflow-x-auto max-h-48">
                  <p className="font-bold">{this.state.error?.name}: {this.state.error?.message}</p>
                  {this.state.error?.stack && (
                    <pre className="text-[10px] whitespace-pre-wrap opacity-80">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
