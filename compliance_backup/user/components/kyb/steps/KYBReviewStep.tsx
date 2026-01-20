
import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';
import { Building, Users, FileText, UserCheck, CheckCircle2, Clock } from 'lucide-react';
import {usePrivy} from '@privy-io/react-auth';

interface KYBReviewStepProps {
  formData: any;
  onSubmit: (data: any) => void;
  onPrevious: () => void;
}

export function KYBReviewStep({ formData, onSubmit, onPrevious }: KYBReviewStepProps) {
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [hasAgreedToPrivacy, setHasAgreedToPrivacy] = useState(false);
  const [hasAgreedToCorporate, setHasAgreedToCorporate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {user} = usePrivy();
  const wallet = user?.wallet?.address;

  const canSubmit = hasAgreedToTerms && hasAgreedToPrivacy && hasAgreedToCorporate;

  const handleSubmit = async () => {
    if (!canSubmit || !wallet) return;

    setIsSubmitting(true);
    
    try {
      const updateData = {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        termsAccepted: hasAgreedToTerms,
        privacyAccepted: hasAgreedToPrivacy,
        corporateAccepted: hasAgreedToCorporate,
        acceptedAt: new Date(),
      };

      // Update KYC application using wallet as identifier
      const response = await fetch('/api/kyb/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet,
          updateData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update KYC application');
      }

      // Update form state
      onSubmit({
        ...formData,
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        termsAccepted: hasAgreedToTerms,
        privacyAccepted: hasAgreedToPrivacy,
        acceptedAt: new Date().toISOString(),
        corporateAccepted: hasAgreedToCorporate,
      });
    } catch (error) {
      console.error('Error updating KYC:', error);
      alert('Failed to update KYC application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
    
  };

  return (
    <div className="space-y-6">
      {/* Business Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Business Information
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Legal Name:</span>
              <p className="text-gray-600">{formData.businessName}</p>
            </div>
            {/* <div>
              <span className="font-medium">Trading Name:</span>
              <p className="text-gray-600">{formData.tradingName || 'N/A'}</p>
            </div> */}
            <div>
              <span className="font-medium">Registration Number:</span>
              <p className="text-gray-600">{formData.registrationNumber}</p>
            </div>
            <div>
              <span className="font-medium">Business Type:</span>
              <p className="text-gray-600">{formData.businessType}</p>
            </div>
            <div>
              <span className="font-medium">Industry:</span>
              <p className="text-gray-600">{formData.industry}</p>
            </div>
            <div>
              <span className="font-medium">Incorporation Date:</span>
              <p className="text-gray-600">{formData.incorporationDate}</p>
            </div>
          </div>
          <Separator />
          <div>
            <span className="font-medium text-sm">Business Address:</span>
            <p className="text-gray-600 text-sm">
              {formData.street}, {formData.city}, {formData.state} {formData.postalCode}, {formData.country}
            </p>
          </div>
          <div>
            <span className="font-medium text-sm">Description:</span>
            <p className="text-gray-600 text-sm">{formData.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Documents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Documents
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.businessDocuments && Object.keys(formData.businessDocuments).map((docType) => (
              <div key={docType} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    {docType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ownership Structure Summary */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ownership Structure
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <span className="font-medium">Total Declared Ownership</span>
            <Badge className="text-lg px-3 py-1">
              {formData.totalOwnership || 0}%
            </Badge>
          </div>
          
          {formData.ultimateBeneficialOwners && (
            <div className="space-y-3">
              <h4 className="font-medium">Ultimate Beneficial Owners:</h4>
              {formData.ultimateBeneficialOwners.map((ubo: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{ubo.firstName} {ubo.lastName}</p>
                    <p className="text-sm text-gray-600">{ubo.nationality}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{ubo.ownershipPercentage}%</Badge>
                    {ubo.isPEP && <Badge className="ml-2 bg-yellow-100 text-yellow-800">PEP</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Authorized Representatives Summary */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Authorized Representatives
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formData.authorizedRepresentatives && (
            <div className="space-y-3">
              {formData.authorizedRepresentatives.map((rep: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{rep.firstName} {rep.lastName}</p>
                    <p className="text-sm text-gray-600">{rep.title}</p>
                    <p className="text-xs text-gray-500">{rep.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {index === 0 && <Badge>Primary</Badge>}
                    {rep.hasSigningAuthority && <Badge variant="outline">Signing Authority</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <Alert className="mt-4">
            <UserCheck className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Steps:</strong> Each authorized representative will receive an email invitation 
              to complete their individual KYC verification process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card> */}

      {/* Terms and Conditions */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Business Account Agreements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={hasAgreedToTerms}
              onCheckedChange={(checked: any) => setHasAgreedToTerms(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the Business Terms of Service and End User License Agreement
              </label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you acknowledge that you have read and agree to our business terms.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={hasAgreedToPrivacy}
              onCheckedChange={(checked: any) => setHasAgreedToPrivacy(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the Privacy Policy and consent to business data processing
              </label>
              <p className="text-xs text-muted-foreground">
                We will process business and personal data in accordance with our privacy policy.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="corporate"
              checked={hasAgreedToCorporate}
              onCheckedChange={(checked: any) => setHasAgreedToCorporate(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="corporate"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I confirm I am authorized to bind this entity to these agreements
              </label>
              <p className="text-xs text-muted-foreground">
                I have the legal authority to enter into these agreements on behalf of the business.
              </p>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Processing Time:</strong> Your KYB application will be reviewed within 1-2 business days. 
              You will receive email notifications about the status of your verification. Individual KYC 
              verifications for authorized representatives must be completed for full account activation.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onPrevious} disabled={isSubmitting}>
          Previous
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!canSubmit || isSubmitting}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting Application...
            </>
          ) : (
            'Submit KYB Application'
          )}
        </Button>
      </div>
    </div>
  );
}
