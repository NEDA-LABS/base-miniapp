import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Download, X, Check, AlertCircle, FileText, User, Building, Clock } from 'lucide-react';
import { VerificationStatus, RiskLevel, DocumentType } from '../../types/kyc';
import { getPublicUrl, getSignedUrl } from '@/utils/supabase/supabase';

interface ApplicationDetailViewProps {
  applicationId: string;
  type: 'KYC' | 'KYB';
  open: boolean;
  onClose: () => void;
  onAction: (action: 'approve' | 'reject' | 'request_info', notes?: string) => void;
}

export function ApplicationDetailView({
  applicationId,
  type,
  open,
  onClose,
  onAction
}: ApplicationDetailViewProps) {
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    const fetchApplication = async () => {
      if (!applicationId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/kyc/admin/applications/${applicationId}`);
        const data = await response.json();
        
        if (response.ok) {
          setApplication(data);
        } else {
          console.error('Error fetching application:', data.error);
        }
      } catch (error) {
        console.error('Error fetching application:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchApplication();
    }
  }, [applicationId, open]);

  const handleDownload = async (document: any) => {
    try {
      const signedUrl = await getSignedUrl('master-verify', document.storageKey);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const getRiskColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW:
        return 'bg-green-100 text-green-800';
      case RiskLevel.MEDIUM:
        return 'bg-yellow-100 text-yellow-800';
      case RiskLevel.HIGH:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeName = (type: DocumentType) => {
    return type
      .toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!fixed left-0 right-0 top-10 bottom-0 mx-auto bg-white max-w-4xl max-h-[90vh] overflow-y-auto ">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              {type === 'KYC' ? <User className="w-6 h-6" /> : <Building className="w-6 h-6" />}
              {type} Application - {application?.firstName || application?.businessName || 'Loading...'}
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading application details...</p>
          </div>
        ) : application ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Badge variant="outline">{type}</Badge>
                <Badge className={getRiskColor(application.riskLevel)}>
                  {application.riskLevel} Risk
                </Badge>
                <Badge variant="secondary">
                  {application.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                Submitted: {new Date(application.submittedAt || application.createdAt).toLocaleString()}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {type === 'KYC' ? 'Personal Information' : 'Business Information'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {type === 'KYC' ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">First Name</p>
                            <p className="font-medium">{application.firstName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Last Name</p>
                            <p className="font-medium">{application.lastName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date of Birth</p>
                            <p className="font-medium">
                              {application.dateOfBirth ? new Date(application.dateOfBirth).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Nationality</p>
                            <p className="font-medium">{application.nationality || 'N/A'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Business Name</p>
                            <p className="font-medium">{application.businessName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Registration Number</p>
                            <p className="font-medium">{application.registrationNumber || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Business Type</p>
                            <p className="font-medium">{application.businessType || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Tax ID</p>
                            <p className="font-medium">{application.taxId || 'N/A'}</p>
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{application.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{application.phoneNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Street</p>
                        <p className="font-medium">{application.street || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">City</p>
                        <p className="font-medium">{application.city || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">State</p>
                        <p className="font-medium">{application.state || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Postal Code</p>
                        <p className="font-medium">{application.postalCode || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Country</p>
                        <p className="font-medium">{application.country || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {type === 'KYC' ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Source of Funds</p>
                          <p className="font-medium">{application.sourceOfFunds || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Employment Status</p>
                          <p className="font-medium">{application.employmentStatus || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Annual Income</p>
                          <p className="font-medium">{application.annualIncome || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Politically Exposed Person</p>
                          <p className="font-medium">{application.isPEP ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Business Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Business Description</p>
                          <p className="font-medium">{application.description || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Website</p>
                          <p className="font-medium">{application.website || 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {type === 'KYB' && application.representatives && application.representatives.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Authorized Representatives</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {application.representatives.map((rep: any) => (
                          <div key={rep.id} className="border rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="font-medium">{rep.firstName} {rep.lastName}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Position</p>
                                <p className="font-medium">{rep.position}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{rep.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Signatory</p>
                                <p className="font-medium">{rep.isSignatory ? 'Yes' : 'No'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {application.documents && application.documents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {application.documents.map((doc: any) => (
                      <Card key={doc.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            {getDocumentTypeName(doc.documentType)}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm truncate">File: {doc.originalName}</p>
                            <p className="text-sm">Status: {doc.status}</p>
                            <div className="flex justify-end mt-4">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="w-4 h-4 mr-2" /> Download
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No documents found for this application.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {application.reviews && application.reviews.length > 0 ? (
                  <div className="space-y-4">
                    {application.reviews.map((review: any) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{review.reviewerId}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(review.reviewedAt).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={
                              review.status === VerificationStatus.APPROVED ? 'secondary' :
                              review.status === VerificationStatus.REJECTED ? 'destructive' : 'secondary'
                            }>
                              {review.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {review.comments && (
                            <div className="mt-3 p-3 bg-gray-50 rounded">
                              <p className="text-sm">{review.comments}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No review history found for this application.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4">
              <div className="space-y-3">
                <h3 className="font-medium">Review Notes</h3>
                <textarea
                  className="w-full p-3 border rounded-md min-h-[100px]"
                  placeholder="Add notes for this review..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      onAction('reject', notes);
                      onClose();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => {
                      onAction('request_info', notes);
                      onClose();
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" /> Request Info
                  </Button>
                  <Button 
                    onClick={() => {
                      onAction('approve', notes);
                      onClose();
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" /> Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Failed to load application details.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}