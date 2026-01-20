
export enum VerificationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  UPLOADED = 'UPLOADED'
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  NATIONAL_ID = 'NATIONAL_ID',
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
  SELFIE = 'SELFIE',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  ARTICLES_OF_INCORPORATION = 'ARTICLES_OF_INCORPORATION',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  FINANCIAL_STATEMENT = 'FINANCIAL_STATEMENT',
  POWER_OF_ATTORNEY = 'POWER_OF_ATTORNEY',
  GOVERNMENT_ISSUED_ID = 'GOVERNMENT_ISSUED_ID'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  PROHIBITED = 'PROHIBITED'
}

export enum BusinessType {
  LLC = 'LLC',
  CORPORATION = 'CORPORATION',
  PARTNERSHIP = 'PARTNERSHIP',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  NON_PROFIT = 'NON_PROFIT',
  TRUST = 'TRUST',
  NGO = 'NGO',
  GOVERNMENT = 'GOVERNMENT',
}

// KYC Individual Types
export interface PersonalInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  phoneNumber: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface IdentityDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  expiryDate: string;
  fileUrl: string;
  verificationStatus: VerificationStatus;
  uploadedAt: Date;
}

export interface FinancialInfo {
  sourceOfFunds: string;
  expectedTransactionVolume: string;
  employmentStatus: string;
  annualIncome?: string;
  isPEP: boolean;
}

export interface KYCProfile {
  id: string;
  userId: string;
  personalInfo: PersonalInfo;
  documents: IdentityDocument[];
  financialInfo: FinancialInfo;
  riskLevel: RiskLevel;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewNotes?: string;
}

// KYB Business Types
export interface BusinessInfo {
  businessName: string;
  registrationNumber: string;
  incorporationDate: string;
  businessType: BusinessType;
  industry: string;
  description: string;
  website?: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  registeredStreet?: string;
  registeredCity?: string;
  registeredState?: string;
  registeredPostalCode?: string;
  registeredCountry?: string;
}

export interface UltimateBeneficialOwner {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  ownershipPercentage: number;
  isPEP: boolean;
  kycProfile?: KYCProfile;
}

export interface AuthorizedRepresentative {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phoneNumber: string;
  hasSigningAuthority: boolean;
  kycProfile: KYCProfile;
}

export interface BusinessDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  verificationStatus: VerificationStatus;
  uploadedAt: Date;
  expiryDate?: Date;
}

export interface KYBProfile {
  id: string;
  userId: string;
  businessInfo: BusinessInfo;
  documents: BusinessDocument[];
  ultimateBeneficialOwners: UltimateBeneficialOwner[];
  authorizedRepresentatives: AuthorizedRepresentative[];
  expectedTransactionVolume: string;
  sourceOfFunds: string;
  riskLevel: RiskLevel;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewNotes?: string;
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  requiresReview?: boolean;
}

export interface ComplianceCheck {
  id: string;
  type: 'SANCTIONS' | 'PEP' | 'AML' | 'DOCUMENT_VERIFICATION';
  status: VerificationStatus;
  details: any;
  performedAt: Date;
  provider?: string;
}
