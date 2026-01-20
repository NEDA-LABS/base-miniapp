
import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Checkbox } from '../../ui/checkbox';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';
import { User, Shield, DollarSign, FileText, CheckCircle2, Clock } from 'lucide-react';
import {usePrivy} from '@privy-io/react-auth';

interface ReviewStepProps {
  formData: any;
  onSubmit: (data: any) => void;
  onPrevious: () => void;
}

export function ReviewStep({ formData, onSubmit, onPrevious }: ReviewStepProps) {
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(false);
  const [hasAgreedToPrivacy, setHasAgreedToPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {user} = usePrivy();
  const wallet = user?.wallet?.address;

  const canSubmit = hasAgreedToTerms && hasAgreedToPrivacy;

  const handleSubmit = async () => {
    if (!canSubmit || !wallet) return;

    setIsSubmitting(true);
    try {
      // Prepare update data
      const updateData = {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        termsAccepted: hasAgreedToTerms,
        privacyAccepted: hasAgreedToPrivacy,
        acceptedAt: new Date()
      };

      // Update KYC application using wallet as identifier
      const response = await fetch('/api/kyc/submit', {
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
      {/* Personal Information Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Full Name:</span>
              <p className="text-gray-600">
                {formData.firstName} {formData.middleName} {formData.lastName}
              </p>
            </div>
            <div>
              <span className="font-medium">Date of Birth:</span>
              <p className="text-gray-600">{formData.dateOfBirth}</p>
            </div>
            <div>
              <span className="font-medium">Nationality:</span>
              <p className="text-gray-600">{formData.nationality}</p>
            </div>
            <div>
              <span className="font-medium">Country of Residence:</span>
              <p className="text-gray-600">{formData.countryOfResidence}</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-gray-600">{formData.email}</p>
            </div>
            <div>
              <span className="font-medium">Phone:</span>
              <p className="text-gray-600">{formData.phoneNumber}</p>
            </div>
          </div>
          <Separator />
          <div>
            <span className="font-medium text-sm">Address:</span>
            <p className="text-gray-600 text-sm">
              {formData.address?.street}, {formData.address?.city}, {formData.address?.state} {formData.address?.postalCode}, {formData.address?.country}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Identity Documents Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Identity Documents
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.documents && Object.keys(formData.documents).map((docType) => (
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

      {/* Financial Information Summary */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Information
            <Badge className="bg-green-100 text-green-800">Complete</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Source of Funds:</span>
              <p className="text-gray-600">{formData.sourceOfFunds}</p>
            </div>
            <div>
              <span className="font-medium">Expected Transaction Volume:</span>
              <p className="text-gray-600">{formData.expectedTransactionVolume}</p>
            </div>
            <div>
              <span className="font-medium">Employment Status:</span>
              <p className="text-gray-600">{formData.employmentStatus}</p>
            </div>
            {formData.annualIncome && (
              <div>
                <span className="font-medium">Annual Income:</span>
                <p className="text-gray-600">{formData.annualIncome}</p>
              </div>
            )}
          </div>
          {formData.isPEP && (
            <Alert className="mt-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>PEP Status:</strong> You have identified yourself as a Politically Exposed Person. Additional verification may be required.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card> */}

      {/* Terms and Conditions */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Legal Agreements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={hasAgreedToTerms}
              onCheckedChange={(checked: boolean) => setHasAgreedToTerms(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the Terms of Service and End User License Agreement
              </label>
              <p className="text-xs text-muted-foreground">
                By checking this box, you acknowledge that you have read and agree to our terms.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={hasAgreedToPrivacy}
              onCheckedChange={(checked: boolean) => setHasAgreedToPrivacy(checked === true)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the Privacy Policy and consent to data processing
              </label>
              <p className="text-xs text-muted-foreground">
                We will use your information in accordance with our privacy policy.
              </p>
            </div>
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Processing Time:</strong> Your KYC application will be reviewed within few hours. 
              You will receive email notifications about the status of your verification.
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
            'Submit KYC Application'
          )}
        </Button>
      </div>
    </div>
  );
}
