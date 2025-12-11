/**
 * Clipboard utility functions with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - The text to copy
 * @returns Promise<ClipboardResult>
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      success: false,
      error: 'Copy functionality is not available in this environment.',
    };
  }

  try {
    // Check if modern clipboard API is available
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } else {
      // Fallback method for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          return { success: true };
        } else {
          return {
            success: false,
            error: 'Copy command failed',
          };
        }
      } catch (fallbackErr) {
        return {
          success: false,
          error: 'Fallback copy method failed',
        };
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Copy text to clipboard with toast notifications
 * @param text - The text to copy
 * @param toast - The toast function from useToast hook
 * @param successMessage - Custom success message (optional)
 * @param errorMessage - Custom error message (optional)
 */
export async function copyToClipboardWithToast(
  text: string,
  toast: (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }) => void,
  successMessage?: string,
  errorMessage?: string
): Promise<void> {
  const result = await copyToClipboard(text);

  if (result.success) {
    toast({
      title: 'Copied!',
      description: successMessage || 'Text has been copied to your clipboard.',
    });
  } else {
    toast({
      title: 'Copy Failed',
      description: errorMessage || result.error || 'Unable to copy text automatically.',
      variant: 'destructive',
    });
  }
}
