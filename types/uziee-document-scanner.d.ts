declare module '@uziee/document-scanner' {
  import { ComponentType } from 'react';

  interface DocumentScannerProps {
    onCapture: (images: string[]) => void;
    onClose?: () => void;
  }

  const DocumentScanner: ComponentType<DocumentScannerProps>;
  export default DocumentScanner;
}
