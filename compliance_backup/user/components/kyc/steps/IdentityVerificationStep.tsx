import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
import { DocumentUpload } from "../DocumentUpload";
import { DocumentType, VerificationStatus } from "../../../types/kyc";
import {
  Upload,
  Camera,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Download,
  X,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import axios from "axios";

interface IdentityVerificationStepProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
}

interface DocumentState {
  type: DocumentType;
  title: string;
  description: string;
  file?: File;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadDate?: string;
  status: VerificationStatus;
  required: boolean;
}

export function IdentityVerificationStep({
  onNext,
  onPrevious,
}: IdentityVerificationStepProps) {
  const { user } = usePrivy();
  const [documents, setDocuments] = useState<DocumentState[]>([
    {
      type: DocumentType.GOVERNMENT_ISSUED_ID,
      title: 'Government-Issued ID',
      description: 'Upload a clear photo of your passport, driver\'s license, or national ID',
      file: undefined,
      fileUrl: undefined,
      status: VerificationStatus.PENDING,
      required: true,
      fileName: undefined,
      fileSize: undefined,
      uploadDate: undefined,
    },
    {
      type: DocumentType.SELFIE,
      title: 'Selfie Verification',
      description: 'Take a clear selfie holding your ID document',
      file: undefined,
      fileUrl: undefined,
      status: VerificationStatus.PENDING,
      required: true,
      fileName: undefined,
      fileSize: undefined,
      uploadDate: undefined,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const walletAddress = user?.wallet?.address;

  useEffect(() => {
    if (walletAddress) {
      fetchDocuments();
    }
  }, [walletAddress]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/kyc/documents?userId=${walletAddress}`
      );
      
      if (response.data.success) {
        const fetchedDocs = response.data.documents;
        
        // Update documents with fetched data
        setDocuments(prevDocs => 
          prevDocs.map(doc => {
            const fetchedDoc = fetchedDocs.find((fetched: any) => fetched.documentType === doc.type);
            
            if (fetchedDoc) {
              return {
                ...doc,
                fileUrl: fetchedDoc.storageUrl,
                fileName: fetchedDoc.originalName,
                fileSize: fetchedDoc.fileSize,
                uploadDate: fetchedDoc.uploadedAt,
                status: fetchedDoc.status as VerificationStatus,
                // Clear any local file since we have server file
                file: undefined,
              };
            }
            return doc;
          })
        );
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFile = async (docType: DocumentType, url?: string) => {
    try {
      setIsProcessing(true);
      
      // If there's a server file, delete it
      if (url) {
        const response = await axios.delete(
          `/api/kyc/documents?storageUrl=${url}`
        );

        if (!response.data.success) {
          throw new Error("Failed to delete file from server");
        }
      }

      // Reset the document state
      setDocuments(prev =>
        prev.map(doc =>
          doc.type === docType
            ? {
                ...doc,
                file: undefined,
                fileUrl: undefined,
                fileName: undefined,
                fileSize: undefined,
                uploadDate: undefined,
                status: VerificationStatus.PENDING,
              }
            : doc
        )
      );

      toast.success("Document removed successfully");
    } catch (error) {
      console.error("Error removing document:", error);
      toast.error("Failed to remove document");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (docType: DocumentType, file: File) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.type === docType
          ? {
              ...doc,
              file,
              // Clear server file data when uploading new file
              fileUrl: undefined,
              fileName: undefined,
              fileSize: undefined,
              uploadDate: undefined,
              status: VerificationStatus.IN_REVIEW,
            }
          : doc
      )
    );
  };

  // Helper function to check if document has any file (local or server)
  const hasFile = (doc: DocumentState): boolean => {
    return !!(doc.file || doc.fileUrl);
  };

  // Helper function to get file info for display
  const getFileInfo = (doc: DocumentState) => {
    if (doc.file) {
      return {
        name: doc.file.name,
        size: Math.round(doc.file.size / 1024),
        date: new Date().toLocaleDateString(),
        isLocal: true,
      };
    } else if (doc.fileUrl) {
      return {
        name: doc.fileName || 'Unknown file',
        size: doc.fileSize ? Math.round(doc.fileSize / 1024) : 0,
        date: doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : 'Unknown',
        isLocal: false,
      };
    }
    return null;
  };

  const canProceed = documents
    .filter(doc => doc.required)
    .every(doc => hasFile(doc));

  const handleNext = async () => {
    if (!canProceed) return;

    setIsProcessing(true);

    try {
      // Only upload documents that have local files (not already on server)
      const documentsToUpload = documents.filter(doc => doc.file);
      
      if (documentsToUpload.length === 0) {
        // All documents are already on server
        toast.success("All documents are already uploaded");
        onNext({ documents: documents.map(doc => ({ type: doc.type, status: doc.status })) });
        return;
      }

      // Create FormData object
      const formData = new FormData();
      
      // Add each document file with its type
      documentsToUpload.forEach(doc => {
        if (doc.file) {
          const docType = doc.type === DocumentType.GOVERNMENT_ISSUED_ID ? 'GOVERNMENT_ISSUED_ID' : 'SELFIE';
          formData.append(`file_${docType}`, doc.file);
        }
      });
      
      // Add application ID (using user's wallet address as ID)
      formData.append("applicationId", user?.wallet?.address || "");

      // Submit to API
      const response = await fetch("/api/kyc/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Update document statuses based on API response
      setDocuments(prev =>
        prev.map(doc => ({
          ...doc,
          status: hasFile(doc) ? VerificationStatus.APPROVED : doc.status,
        }))
      );

      toast.success("Documents uploaded successfully");
      onNext({ documents: result.data.documents });
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents");
    } finally {
      setIsProcessing(false);
    }
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
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <Badge className="bg-success">Verified</Badge>;
      case VerificationStatus.IN_REVIEW:
        return <Badge className="bg-warning">Processing</Badge>;
      case VerificationStatus.REJECTED:
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Required</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-2">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your documents are encrypted and securely stored. We use
          industry-standard security measures to protect your personal
          information.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {documents.map((doc) => {
          const fileInfo = getFileInfo(doc);
          
          return (
            <Card key={doc.type} className="transition-all hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(doc.status)}
                    <div>
                      <CardTitle className="text-lg">{doc.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(doc.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {fileInfo ? (
                    // Show file info and delete button when file exists
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{fileInfo.name}</p>
                          <p className="text-xs text-gray-500">
                            {fileInfo.size} KB • {fileInfo.date}
                            {fileInfo.isLocal && (
                              <span className="ml-2 text-orange-600">
                                
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.fileUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.fileUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(doc.type, doc.fileUrl)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Show upload field only when no file exists
                    <DocumentUpload
                      documentType={doc.type}
                      onFileUpload={(file) => handleFileUpload(doc.type, file)}
                      onFileRemove={() => handleRemoveFile(doc.type)}
                      currentFile={undefined}
                      maxSize={10} // 10MB
                      acceptedTypes={["image/jpeg", "image/png", "application/pdf"]}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">
                Document Security
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• All documents are encrypted using AES-256 encryption</li>
                <li>
                  • Files are automatically deleted after verification is
                  complete
                </li>
                <li>• We comply with GDPR and other privacy regulations</li>
                <li>
                  • Your data is never shared with third parties without consent
                </li>
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
            "Continue to Review"
          )}
        </Button>
      </div>
    </div>
  );
}