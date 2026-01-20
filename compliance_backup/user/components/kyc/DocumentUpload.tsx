
import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { DocumentType } from '../../types/kyc';
import { Upload, File, X, Camera, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DocumentUploadProps {
  documentType: DocumentType;
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
  currentFile?: File;
  fileUrl?: string; // Add file URL prop
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export function DocumentUpload({
  documentType,
  onFileUpload,
  onFileRemove,
  currentFile,
  fileUrl,
  maxSize = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf']
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Please upload ${acceptedTypes.join(', ')} files only.`;
    }

    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB.`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isSelfie = documentType === DocumentType.SELFIE;

  if (currentFile || fileUrl) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <File className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Uploaded Document</h3>
                <div className="space-y-1">
                  {currentFile && (
                    <p className="text-sm text-green-700">{currentFile.name}</p>
                  )}
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:text-green-900 underline"
                    >
                      View Document
                    </a>
                  )}
                  {currentFile && (
                    <p className="text-xs text-green-600">{formatFileSize(currentFile.size)}</p>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onFileRemove}
              className="text-green-700 hover:text-green-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed transition-all cursor-pointer hover:border-primary/50",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300",
          error ? "border-red-300 bg-red-50" : ""
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {isSelfie ? (
              <Camera className="w-12 h-12 text-gray-400" />
            ) : (
              <Upload className="w-12 h-12 text-gray-400" />
            )}
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isSelfie ? 'Take or Upload Selfie' : 'Upload Document'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag and drop your file here, or click to browse
              </p>
            </div>
            <div className="text-xs text-gray-400">
              <p>Supported formats: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</p>
              <p>Maximum file size: {maxSize}MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSelfie && (
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription>
            <strong>Selfie Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Hold your ID document next to your face</li>
              <li>Ensure your face is clearly visible and well-lit</li>
              <li>Look directly at the camera</li>
              <li>Remove sunglasses or hats</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}
