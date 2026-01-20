'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { KYCWizard } from './components/kyc/KYCWizard';
import { KYBWizard } from './components/kyb/KYBWizard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  Shield, 
  Users, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  FileText,
  Globe,
  Lock,
  Settings
} from 'lucide-react';
import './kyc.css';
import {usePrivy} from '@privy-io/react-auth';

const Index = () => {
  const [activeFlow, setActiveFlow] = useState<'home' | 'kyc' | 'kyb' | 'admin'>('home');
  const [verificationStatus, setVerificationStatus] = useState<'none' | 'kyc_pending' | 'kyb_pending' | 'approved'>('none');
  const {authenticated} = usePrivy();
  const admin1 = process.env.NEXT_PUBLIC_ADMIN1!;
  const admin2 = process.env.NEXT_PUBLIC_ADMIN2!;
  const admin3 = process.env.NEXT_PUBLIC_ADMIN3!;
  const {user} = usePrivy();
  const currentAddress = user?.wallet?.address;

  const handleKYCComplete = () => {
    setVerificationStatus('kyc_pending');
    setActiveFlow('home');
  };

  const handleKYBComplete = () => {
    setVerificationStatus('kyb_pending');
    setActiveFlow('home');
  };

  const renderHomeView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => window.history.back()}
          className="!group !flex !items-center !gap-2 !px-4 !py-2 !bg-white !border !border-gray-200 !rounded-full !text-sm !font-semibold !text-gray-700 !hover:bg-blue-50 !hover:shadow-md !transition-all !duration-300"
        >
          <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span> Back
        </button>
      </div>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            {/* <Shield className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold text-gray-900">SecurePayments</h1> */}
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete your identity verification to access our secure stablecoin payment platform
          </p>
        </div>

        {/* Status Banner */}
        {verificationStatus !== 'none' && (
          <Card className="mb-8 border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {verificationStatus === 'kyc_pending' ? 'KYC Application Submitted' : 'KYB Application Submitted'}
                  </h3>
                  <p className="text-gray-600">
                    Your verification is under review. We'll notify you via email once the process is complete.
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Clock className="w-4 h-4 mr-2" />
                  Under Review
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Individual KYC */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl">Individual Verification</h3>
                  <p className="text-sm text-gray-600 font-normal">KYC for personal accounts</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Verify your identity to access personal trading and payment features with transaction limits up to $50,000.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Personal document verification</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Identity and address confirmation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Financial background assessment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Process time: 1-3 business days</span>
                </div>
              </div>

              <Button 
                className="w-full mt-6 !border-2 !border-blue-500 hover:!bg-blue-50 !transition-all hover:!shadow-lg" 
                onClick={() => setActiveFlow('kyc')}
                disabled={verificationStatus === 'kyc_pending'}
              >
                {verificationStatus === 'kyc_pending' ? 'KYC Application Submitted' : 'Start Individual Verification'}
              </Button>
            </CardContent>
          </Card>

          {/* Business KYB */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl">Business Verification</h3>
                  <p className="text-sm text-gray-600 font-normal">KYB for corporate accounts</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Verify your business to access corporate features with higher transaction limits and advanced tools.
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Business registration verification</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Ownership structure disclosure</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Authorized representative KYC</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Process time: 3-7 business days</span>
                </div>
              </div>

              <Button 
                className="w-full mt-6 !border-2 !border-green-500 hover:!bg-green-50" 
                onClick={() => setActiveFlow('kyb')}
                disabled={verificationStatus === 'kyb_pending'}
              >
                {verificationStatus === 'kyb_pending' ? 'KYB Application Submitted' : 'Start Business Verification'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Admin Access */}

        {(currentAddress === admin1 || currentAddress === admin2 || currentAddress === admin3) && (
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Settings className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Administrative Access</h3>
                  <p className="text-gray-600">Compliance team portal for verification management</p>
                </div>
              </div>
              <Button onClick={() => setActiveFlow('admin')} className="!border-2 !border-green-500 hover:!bg-green-50">
                Access Admin Portal
              </Button>
            </div>
          </CardContent>
        </Card>
        )}
        </div>
      <Footer />
    </div>
  );

  const renderContent = () => {
    switch (activeFlow) {
      case 'kyc':
        return (
          <div className="min-h-screen bg-gray-50 py-8">
            <KYCWizard onComplete={handleKYCComplete} />
          </div>
        );
      case 'kyb':
        return (
          <div className="min-h-screen bg-gray-50 py-8">
            <KYBWizard onComplete={handleKYBComplete} />
          </div>
        );
      case 'admin':
        return (
          <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-6">
              <AdminDashboard 
                onVerificationAction={(id, action, notes) => {
                  console.log('Verification action:', { id, action, notes });
                  // Handle verification approval/rejection
                }}
              />
            </div>
          </div>
        );
      default:
        return renderHomeView();
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      {activeFlow !== 'home' && (
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Button 
              onClick={() => setActiveFlow('home')}
              className="flex items-center gap-2"
            >
              NedaPay KYC/KYB
            </Button>
            <div className="flex items-center gap-4">
              <Badge className="text-sm">
                {activeFlow === 'kyc' ? 'Individual Verification' : 
                 activeFlow === 'kyb' ? 'Business Verification' : 
                 'Admin Portal'}
              </Badge>
            </div>
          </div>
        </nav>
      )}

      {renderContent()}
    </div>
  );
};

export default Index;
