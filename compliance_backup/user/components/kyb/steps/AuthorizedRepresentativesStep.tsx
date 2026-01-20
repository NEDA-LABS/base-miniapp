
// import { useState } from 'react';
// import { useForm, useFieldArray } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { Button } from '../../ui/button';
// import { Input } from '../../ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../ui/form';
// import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
// import { Checkbox } from '../../ui/checkbox';
// import { Alert, AlertDescription } from '../../ui/alert';
// import { Badge } from '../../ui/badge';
// import { AuthorizedRepresentative } from '../../../types/kyc';
// import { UserCheck, Plus, Trash2, Shield, FileText } from 'lucide-react';

// const representativeSchema = z.object({
//   firstName: z.string().min(2, 'First name is required'),
//   lastName: z.string().min(2, 'Last name is required'),
//   title: z.string().min(2, 'Title/Position is required'),
//   email: z.string().email('Valid email is required'),
//   phoneNumber: z.string().min(10, 'Valid phone number is required'),
//   hasSigningAuthority: z.boolean(),
//   dateOfBirth: z.string().min(1, 'Date of birth is required'),
//   nationality: z.string().min(1, 'Nationality is required'),
//   address: z.object({
//     street: z.string().min(5, 'Street address is required'),
//     city: z.string().min(2, 'City is required'),
//     state: z.string().min(2, 'State is required'),
//     postalCode: z.string().min(4, 'Postal code is required'),
//     country: z.string().min(1, 'Country is required'),
//   }),
// });

// const authRepSchema = z.object({
//   representatives: z.array(representativeSchema).min(1, 'At least one authorized representative is required'),
//   boardResolutionUploaded: z.boolean(),
//   powerOfAttorneyUploaded: z.boolean(),
// });

// interface AuthorizedRepresentativesStepProps {
//   onNext: (data: any) => void;
//   onPrevious: () => void;
// }

// const COUNTRIES = [
//   'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 
//   'Japan', 'Australia', 'Singapore', 'Switzerland', 'Other'
// ];

// const TITLES = [
//   'Chief Executive Officer (CEO)',
//   'Chief Financial Officer (CFO)',
//   'Chief Operating Officer (COO)',
//   'President',
//   'Vice President',
//   'Director',
//   'Managing Director',
//   'General Manager',
//   'Secretary',
//   'Treasurer',
//   'Other'
// ];

// export function AuthorizedRepresentativesStep({ onNext, onPrevious }: AuthorizedRepresentativesStepProps) {
//   const form = useForm({
//     resolver: zodResolver(authRepSchema),
//     defaultValues: {
//       representatives: [{
//         firstName: '',
//         lastName: '',
//         title: '',
//         email: '',
//         phoneNumber: '',
//         hasSigningAuthority: true,
//         dateOfBirth: '',
//         nationality: '',
//         address: {
//           street: '',
//           city: '',
//           state: '',
//           postalCode: '',
//           country: '',
//         }
//       }],
//       boardResolutionUploaded: false,
//       powerOfAttorneyUploaded: false,
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control: form.control,
//     name: 'representatives',
//   });

//   const addRepresentative = () => {
//     append({
//       firstName: '',
//       lastName: '',
//       title: '',
//       email: '',
//       phoneNumber: '',
//       hasSigningAuthority: false,
//       dateOfBirth: '',
//       nationality: '',
//       address: {
//         street: '',
//         city: '',
//         state: '',
//         postalCode: '',
//         country: '',
//       }
//     });
//   };

//   const removeRepresentative = (index: number) => {
//     if (fields.length > 1) {
//       remove(index);
//     }
//   };

//   const onSubmit = (data: any) => {
//     const representativesData = {
//       authorizedRepresentatives: data.representatives.map((rep: any, index: number) => ({
//         id: `rep-${index}`,
//         ...rep,
//         kycProfile: null, // Will be populated during individual KYC process
//       })),
//       boardResolutionUploaded: data.boardResolutionUploaded,
//       powerOfAttorneyUploaded: data.powerOfAttorneyUploaded,
//     };

//     onNext(representativesData);
//   };

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//         {/* Header */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <UserCheck className="w-5 h-5" />
//               Authorized Representatives
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Alert>
//               <Shield className="h-4 w-4" />
//               <AlertDescription>
//                 <strong>Important:</strong> All authorized representatives must complete individual KYC verification 
//                 before the business account can be fully activated.
//               </AlertDescription>
//             </Alert>
//           </CardContent>
//         </Card>

//         {/* Representative Forms */}
//         <div className="space-y-6">
//           {fields.map((field, index) => (
//             <Card key={field.id} className={`relative ${index === 0 ? 'border-l-4 border-l-primary' : ''}`}>
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-lg">
//                     Authorized Representative #{index + 1}
//                     {index === 0 && <Badge className="ml-2">Primary</Badge>}
//                   </CardTitle>
//                   <div className="flex items-center gap-2">
//                     {form.watch(`representatives.${index}.hasSigningAuthority`) && (
//                       <Badge variant="outline">Signing Authority</Badge>
//                     )}
//                     {fields.length > 1 && index > 0 && (
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => removeRepresentative(index)}
//                         className="text-red-600 hover:text-red-700"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {/* Basic Information */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.firstName`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>First Name *</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Enter first name" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.lastName`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Last Name *</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Enter last name" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.title`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Title/Position *</FormLabel>
//                         <Select onValueChange={field.onChange} defaultValue={field.value}>
//                           <FormControl>
//                             <SelectTrigger>
//                               <SelectValue placeholder="Select title" />
//                             </SelectTrigger>
//                           </FormControl>
//                           <SelectContent>
//                             {TITLES.map((title) => (
//                               <SelectItem key={title} value={title}>
//                                 {title}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <div className="flex items-center space-x-3 mt-8">
//                     <FormField
//                       control={form.control}
//                       name={`representatives.${index}.hasSigningAuthority`}
//                       render={({ field }) => (
//                         <FormItem className="flex flex-row items-center space-x-3 space-y-0">
//                           <FormControl>
//                             <Checkbox
//                               checked={field.value}
//                               onCheckedChange={field.onChange}
//                             />
//                           </FormControl>
//                           <FormLabel className="text-sm font-normal">
//                             Has signing authority for the business
//                           </FormLabel>
//                         </FormItem>
//                       )}
//                     />
//                   </div>
//                 </div>

//                 {/* Contact Information */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.email`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Email Address *</FormLabel>
//                         <FormControl>
//                           <Input type="email" placeholder="Enter email address" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.phoneNumber`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Phone Number *</FormLabel>
//                         <FormControl>
//                           <Input placeholder="+1 (555) 123-4567" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                 </div>

//                 {/* Personal Details */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.dateOfBirth`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Date of Birth *</FormLabel>
//                         <FormControl>
//                           <Input type="date" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.nationality`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Nationality *</FormLabel>
//                         <Select onValueChange={field.onChange} defaultValue={field.value}>
//                           <FormControl>
//                             <SelectTrigger>
//                               <SelectValue placeholder="Select nationality" />
//                             </SelectTrigger>
//                           </FormControl>
//                           <SelectContent>
//                             {COUNTRIES.map((country) => (
//                               <SelectItem key={country} value={country}>
//                                 {country}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                 </div>

//                 {/* Address */}
//                 <div className="space-y-4 border-t pt-4">
//                   <h4 className="font-medium text-gray-900">Address Information</h4>
//                   <FormField
//                     control={form.control}
//                     name={`representatives.${index}.address.street`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Street Address *</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Enter street address" {...field} />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                     <FormField
//                       control={form.control}
//                       name={`representatives.${index}.address.city`}
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>City *</FormLabel>
//                           <FormControl>
//                             <Input placeholder="Enter city" {...field} />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={form.control}
//                       name={`representatives.${index}.address.state`}
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>State/Province *</FormLabel>
//                           <FormControl>
//                             <Input placeholder="Enter state" {...field} />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={form.control}
//                       name={`representatives.${index}.address.postalCode`}
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>Postal Code *</FormLabel>
//                           <FormControl>
//                             <Input placeholder="Enter postal code" {...field} />
//                           </FormControl>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                     <FormField
//                       control={form.control}
//                       name={`representatives.${index}.address.country`}
//                       render={({ field }) => (
//                         <FormItem>
//                           <FormLabel>Country *</FormLabel>
//                           <Select onValueChange={field.onChange} defaultValue={field.value}>
//                             <FormControl>
//                               <SelectTrigger>
//                                 <SelectValue placeholder="Select country" />
//                               </SelectTrigger>
//                             </FormControl>
//                             <SelectContent>
//                               {COUNTRIES.map((country) => (
//                                 <SelectItem key={country} value={country}>
//                                   {country}
//                                 </SelectItem>
//                               ))}
//                             </SelectContent>
//                           </Select>
//                           <FormMessage />
//                         </FormItem>
//                       )}
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>

//         {/* Add Representative Button */}
//         <div className="flex justify-center">
//           <Button
//             type="button"
//             variant="outline"
//             onClick={addRepresentative}
//             className="flex items-center gap-2"
//           >
//             <Plus className="w-4 h-4" />
//             Add Another Representative
//           </Button>
//         </div>

//         {/* Required Documents */}
//         <Card className="bg-yellow-50 border-yellow-200">
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2 text-yellow-800">
//               <FileText className="w-5 h-5" />
//               Required Supporting Documents
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="space-y-3">
//               <FormField
//                 control={form.control}
//                 name="boardResolutionUploaded"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-row items-center space-x-3 space-y-0">
//                     <FormControl>
//                       <Checkbox
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                     <FormLabel className="text-sm font-normal">
//                       Board resolution authorizing these representatives to act on behalf of the company
//                     </FormLabel>
//                   </FormItem>
//                 )}
//               />
              
//               <FormField
//                 control={form.control}
//                 name="powerOfAttorneyUploaded"
//                 render={({ field }) => (
//                   <FormItem className="flex flex-row items-center space-x-3 space-y-0">
//                     <FormControl>
//                       <Checkbox
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                     <FormLabel className="text-sm font-normal">
//                       Power of attorney documents (if applicable)
//                     </FormLabel>
//                   </FormItem>
//                 )}
//               />
//             </div>

//             <Alert>
//               <FileText className="h-4 w-4" />
//               <AlertDescription className="text-yellow-800">
//                 <strong>Note:</strong> These documents can be uploaded after submission. 
//                 Each authorized representative will need to complete individual KYC verification.
//               </AlertDescription>
//             </Alert>
//           </CardContent>
//         </Card>

//         <div className="flex justify-between pt-6">
//           <Button variant="outline" onClick={onPrevious}>
//             Previous
//           </Button>
//           <Button type="submit" className="px-8">
//             Continue to Review
//           </Button>
//         </div>
//       </form>
//     </Form>
//   );
// }
