import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { DocumentUpload } from '../../kyc/DocumentUpload';
import { DocumentType, VerificationStatus } from '../../../types/kyc';
import { FileText, Building, Shield, AlertTriangle, CheckCircle2, Eye, Download, X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import axios from 'axios';
import { useEffect } from 'react';

interface DocumentState {
  type: DocumentType;
  title: string;
  description: string;
  file?: File;
  fileUrl?: string;
  status: VerificationStatus;
  required: boolean;
  fileName?: string;
  fileSize?: number;
  uploadDate?: string;
}

interface BusinessDocumentsStepProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
}

export function BusinessDocumentsStep({ onNext, onPrevious }: BusinessDocumentsStepProps) {
  const { user } = usePrivy();
  const [documents, setDocuments] = useState<DocumentState[]>([
    {
      type: DocumentType.BUSINESS_REGISTRATION,
      title: 'Business Registration Certificate',
      description: 'Upload your official business registration certificate',
      file: undefined,
      fileUrl: undefined,
      status: VerificationStatus.PENDING,
      required: true
    },
    {
      type: DocumentType.TAX_CERTIFICATE,
      title: 'Tax Certificate',
      description: "Upload your company's tax certificate",
      file: undefined,
      fileUrl: undefined,
      status: VerificationStatus.PENDING,
      required: true
    },
    // {
    //   type: DocumentType.FINANCIAL_STATEMENT,
    //   title: 'Financial Statement',
    //   description: 'Upload your company's financial statement',
    //   file: undefined,
    //   fileUrl: undefined,
    //   status: VerificationStatus.PENDING,
    //   required: true
    // }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user?.wallet?.address) {
      fetchDocuments(user?.wallet?.address);
    }
  }, [user?.wallet?.address]);

  const fetchDocuments = async (walletAddress: string) => {
    try {
      const response = await axios.get(`/api/kyb/documents?userId=${walletAddress}`);
      // console.log('Fetch response:', response.data); // Debug log
      
      if (response.data.success && response.data.documents) {
        // Map server documents to our document types
        const serverDocsMap = response.data.documents.reduce((acc: any, serverDoc: any) => {
          acc[serverDoc.documentType] = serverDoc;
          return acc;
        }, {} as Record<string, any>);

        setDocuments(prev => prev.map((doc: DocumentState) => {
          const serverDoc = serverDocsMap[doc.type];
          // console.log('Server doc for type', doc.type, ':', serverDoc); // Debug log
          
          if (serverDoc) {
            return { 
              ...doc,
              status: serverDoc.status as VerificationStatus,
              fileUrl: serverDoc.storageUrl,
              fileName: serverDoc.originalName,
              fileSize: serverDoc.fileSize,
              uploadDate: serverDoc.uploadedAt,
              file: doc.file // Keep existing file if present
            };
          }
          return doc;
        }));
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Failed to fetch documents');
    }
  };

  
  

  const handleFileUpload = async (docType: DocumentType, file: File) => {
    try {
      setIsProcessing(true);
      const formData = new FormData();
      formData.append('files', file);
      formData.append('documentType', docType.toString());
      formData.append('currentAddress', user?.wallet?.address || '');

      const response = await axios.post('/api/kyb/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Update document state with new status and URL
        setDocuments(prev => prev.map((doc: DocumentState) => 
          doc.type === docType
            ? { 
                ...doc,
                status: VerificationStatus.UPLOADED,
                fileUrl: response.data.documents[0].storageUrl,
                fileName: file.name,
                fileSize: file.size,
                uploadDate: new Date().toISOString(),
                file: undefined
              }
            : doc
        ));
        toast.success('Document uploaded successfully');
      } else {
        throw new Error(response.data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = async (url: string) => {
    try {
      setIsProcessing(true);
      const response = await axios.delete(`/api/kyb/documents?userId=${user?.wallet?.address}&storageUrl=${url}`);
      
      if (response.data.success) {
        setDocuments(prev => prev.map((doc: DocumentState) => 
          doc.fileUrl === url
            ? { 
                ...doc,
                status: VerificationStatus.PENDING,
                fileUrl: undefined,
                fileName: undefined,
                fileSize: undefined,
                uploadDate: undefined,
                file: undefined
              }
            : doc
        ));
        toast.success('Document removed successfully');
      } else {
        throw new Error(response.data.message || 'Failed to remove document');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove document');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewFile = async (documentId: string, fileName: string) => {
    try {
      const response = await axios.get(`/api/kyb/documents/signed-url?userId=${user?.wallet?.address}&url=${documentId}`);
      
      if (response.data.success) {
        window.open(response.data.signedUrl, '_blank');
      } else {
        toast.error('Failed to generate preview URL');
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to preview document');
    }
  };

  // const handleDownloadFile = (fileUrl: string, fileName: string) => {
  //   if (fileUrl) {
  //     const link = document.createElement('a');
  //     link.href = fileUrl;
  //     link.download = fileName || 'document';
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   }
  // };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canProceed = documents.filter(doc => doc.required).every(doc => 
    doc.status === VerificationStatus.UPLOADED || doc.status === VerificationStatus.APPROVED
  );

  const handleNext = async () => {
    if (!canProceed) {
      toast.error('Please upload all required documents');
      return;
    }

    setIsProcessing(true);
    
    // Simulate document processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update document statuses
    setDocuments(prev => prev.map(doc => ({
      ...doc,
      status: doc.fileUrl ? VerificationStatus.APPROVED : doc.status,
    })));

    const documentData = documents.reduce((acc, doc) => {
      if (doc.fileUrl) {
        acc[doc.type] = {
          type: doc.type,
          fileUrl: doc.fileUrl,
          fileName: doc.fileName,
          status: VerificationStatus.APPROVED,
        };
      }
      return acc;
    }, {} as any);

    setIsProcessing(false);
    onNext({ businessDocuments: documentData });
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case VerificationStatus.IN_REVIEW:
        return <Shield className="w-5 h-5 text-warning" />;
      case VerificationStatus.REJECTED:
        return <AlertTriangle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus, required: boolean) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <Badge className="bg-success">Verified</Badge>;
      case VerificationStatus.IN_REVIEW:
        return <Badge className="bg-warning">Processing</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="destructive">Rejected</Badge>;
      case VerificationStatus.UPLOADED:
        return <Badge className="bg-blue-500">Uploaded</Badge>;
      default:
        return <Badge variant={required ? "default" : "outline"}>
          {required ? "Required" : "Optional"}
        </Badge>;
    }
  };

  const renderUploadedFile = (doc: DocumentState) => {
    // Debug log to see what we have
    // console.log('Rendering doc:', doc.type, {
    //   fileUrl: doc.fileUrl,
    //   fileName: doc.fileName,
    //   status: doc.status
    // });

    if (!doc.fileUrl && !doc.fileName) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.fileName || 'Uploaded Document'}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                {doc.fileSize && (
                  <span>{formatFileSize(doc.fileSize)}</span>
                )}
                {doc.uploadDate && (
                  <>
                    <span>•</span>
                    <span>Uploaded {formatDate(doc.uploadDate)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {doc.fileUrl && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewFile(doc.fileUrl!, doc.fileName!)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
                {/* <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadFile(doc.fileUrl!, doc.fileName!)}
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button> */}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemoveFile(doc.fileUrl as string)}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isProcessing}
            >
              <X className="w-4 h-4" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Business documents are securely encrypted and stored. We comply with international data protection standards.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {documents.map((doc) => (
          <Card key={doc.type} className="transition-all hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(doc.status)}
                  <div>
                    <CardTitle className="text-lg">{doc.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  </div>
                </div>
                {getStatusBadge(doc.status, doc.required)}
              </div>
            </CardHeader>
            <CardContent>
              {/* Debug info - remove in production */}
              {/* <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <strong>Debug:</strong> fileUrl: {doc.fileUrl || 'none'}, fileName: {doc.fileName || 'none'}, status: {doc.status}
              </div> */}
              
              {/* Show uploaded file if exists */}
              {doc.status === VerificationStatus.UPLOADED || doc.status === VerificationStatus.APPROVED ? (
                renderUploadedFile(doc)
              ) : (
                <DocumentUpload
                  documentType={doc.type}
                  onFileUpload={(file) => handleFileUpload(doc.type, file)}
                  onFileRemove={() => handleRemoveFile(doc.type)}
                  currentFile={doc.file}
                  fileUrl={doc.fileUrl}
                  maxSize={10} // 10MB
                  acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Requirements */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Building className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Document Requirements</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• All documents must be current and not expired</li>
                <li>• Documents should be clear, readable, and in color</li>
                <li>• Accepted formats: PDF, JPG, PNG (max 10MB each)</li>
                <li>• Documents must be official and issued by relevant authorities</li>
                <li>• Translated documents must include certified translations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious}>
          Previous
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!canProceed || isProcessing}
          className="px-8"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing Documents...
            </>
          ) : (
            'Continue to Review'
          )}
        </Button>
      </div>
    </div>
  );
}