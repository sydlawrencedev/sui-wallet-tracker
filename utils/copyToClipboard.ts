export const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(
    () => {
      // Success - you could add a toast notification here if desired
      console.log('Copied to clipboard');
    },
    (err) => {
      console.error('Failed to copy text: ', err);
    }
  );
};
