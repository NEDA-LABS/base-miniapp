
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { BusinessInfo, BusinessType } from '../../../types/kyc';
import { Building, MapPin, Globe, Calendar, Phone } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Countries } from '@/data/countries';

const businessInfoSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  incorporationDate: z.string().min(10, 'Incorporation date is required'),
  businessType: z.nativeEnum(BusinessType),
  industry: z.string().min(1, 'Industry is required'),
  description: z.string().min(10, 'Description is required'),
  website: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  contactPhone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^\+?[0-9\s-]+$/, 'Please enter a valid phone number'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(2, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  registeredStreet: z.string().min(5, 'Street address is required').optional(),
  registeredCity: z.string().min(2, 'City is required').optional(),
  registeredState: z.string().min(2, 'State is required').optional(),
  registeredPostalCode: z.string().min(2, 'Postal code is required').optional(),
  registeredCountry: z.string().min(2, 'Country is required').optional(),
  sameAsBusinessAddress: z.boolean().optional(),
}).transform((data) => ({
  ...data,
  registeredStreet: data.sameAsBusinessAddress ? data.street : data.registeredStreet,
  registeredCity: data.sameAsBusinessAddress ? data.city : data.registeredCity,
  registeredState: data.sameAsBusinessAddress ? data.state : data.registeredState,
  registeredPostalCode: data.sameAsBusinessAddress ? data.postalCode : data.registeredPostalCode,
  registeredCountry: data.sameAsBusinessAddress ? data.country : data.registeredCountry,
}));

interface BusinessInfoStepProps {
  onNext: (data: BusinessInfo) => void;
  initialData?: Partial<BusinessInfo>;
}

const BUSINESS_TYPES = [
  { value: BusinessType.LLC, label: 'Limited Liability Company (LLC)' },
  { value: BusinessType.CORPORATION, label: 'Corporation' },
  { value: BusinessType.PARTNERSHIP, label: 'Partnership' },
  { value: BusinessType.SOLE_PROPRIETORSHIP, label: 'Sole Proprietorship' },
  { value: BusinessType.NON_PROFIT, label: 'Non-Profit Organization' },
  { value: BusinessType.TRUST, label: 'Trust' },
];

const INDUSTRIES = [
  'Technology', 'Financial Services', 'Healthcare', 'E-commerce', 'Manufacturing',
  'Real Estate', 'Education', 'Legal Services', 'Consulting', 'Media & Entertainment',
  'Retail', 'Transportation', 'Energy', 'Agriculture', 'Other'
];

// const COUNTRIES = [
//   'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 
//   'Japan', 'Australia', 'Singapore', 'Switzerland', 'Other'
// ];

export function BusinessInfoStep({ onNext, initialData }: BusinessInfoStepProps) {
  const { user } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BusinessInfo & { sameAsBusinessAddress?: boolean }>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessName: initialData?.businessName || '',
      registrationNumber: initialData?.registrationNumber || '',
      incorporationDate: initialData?.incorporationDate || '',
      businessType: initialData?.businessType || BusinessType.LLC,
      industry: initialData?.industry || '',
      description: initialData?.description || '',
      website: initialData?.website || '',
      contactEmail: initialData?.contactEmail || '',
      contactPhone: initialData?.contactPhone || '',
      street: initialData?.street || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      postalCode: initialData?.postalCode || '',
      country: initialData?.country || '',
      // registeredStreet: initialData?.registeredStreet || undefined,
      // registeredCity: initialData?.registeredCity || undefined,
      // registeredState: initialData?.registeredState || undefined,
      // registeredPostalCode: initialData?.registeredPostalCode || undefined,
      // registeredCountry: initialData?.registeredCountry || undefined,
      // sameAsBusinessAddress: false,
    },
  });

  useEffect(() => {
    if (user?.id) {
      fetchBusinessInfo(user.id);
    }
  }, [user?.id]);

  const fetchBusinessInfo = async (userId: string) => {
    try {
      const response = await axios.get(`/api/kyb/business-info?userId=${userId}`);
      if (response.data.success && response.data.data) {
        form.reset(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching business info:', err);
      setError('Failed to fetch business information');
    }
  };

  const watchSameAddress = form.watch('sameAsBusinessAddress');

  const handleSubmit = async (data: BusinessInfo & { sameAsBusinessAddress?: boolean }) => {
    try {
      setLoading(true);
      setError(null);

      const businessData: BusinessInfo = {
        businessName: data.businessName,
        registrationNumber: data.registrationNumber,
        incorporationDate: data.incorporationDate,
        businessType: data.businessType,
        industry: data.industry,
        description: data.description,
        website: data.website,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        // registeredStreet: watchSameAddress ? data.street : data.registeredStreet,
        // registeredCity: watchSameAddress ? data.city : data.registeredCity,
        // registeredState: watchSameAddress ? data.state : data.registeredState,
        // registeredPostalCode: watchSameAddress ? data.postalCode : data.registeredPostalCode,
        // registeredCountry: watchSameAddress ? data.country : data.registeredCountry,
      };

      await axios.post('/api/kyb/business-info', {
        ...businessData,
        email: user?.email?.address,
        userId: user?.id,
        wallet: user?.wallet?.address,
        status: 'PENDING_DOCUMENTS',
      });

      onNext(businessData);
    } catch (err) {
      console.error('Error saving business info:', err);
      setError('Failed to save business information');
    } finally {
      setLoading(false);
    }
  };

  const copyBusinessAddress = (checked: boolean) => {
    if (checked) {
      const businessAddress = {
        street: form.getValues('street'),
        city: form.getValues('city'),
        state: form.getValues('state'),
        postalCode: form.getValues('postalCode'),
        country: form.getValues('country')
      };
      form.setValue('registeredStreet', businessAddress.street);
      form.setValue('registeredCity', businessAddress.city);
      form.setValue('registeredState', businessAddress.state);
      form.setValue('registeredPostalCode', businessAddress.postalCode);
      form.setValue('registeredCountry', businessAddress.country);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Basic Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter legal business name" {...field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" className='!bg-white'/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Registration Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter registration number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="incorporationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Incorporation *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry/Sector *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe your business activities, products, and services"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 (555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

        {/* Business Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Business Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter postal code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Registered Address */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Registered Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sameAddress"
                checked={watchSameAddress}
                onCheckedChange={(checked: any) => {
                  form.setValue('sameAsBusinessAddress', checked as boolean);
                  copyBusinessAddress(checked as boolean);
                }}
              />
              <label
                htmlFor="sameAddress"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Same as business address
              </label>
            </div>

            {!watchSameAddress && (
              <>
                <FormField
                  control={form.control}
                  name="registeredStreet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter street address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="registeredCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registeredState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter state" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registeredPostalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registeredCountry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {country}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card> */}
        <div className="flex justify-end">
          <Button type="submit" className="px-8">
            Continue to Business Documents
          </Button>
        </div>
      </form>
    </Form>
  );
}

