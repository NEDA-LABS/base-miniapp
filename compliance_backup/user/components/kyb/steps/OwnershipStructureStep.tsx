
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
// import { UltimateBeneficialOwner } from '../../../types/kyc';
// import { Users, Plus, Trash2, AlertTriangle, Shield } from 'lucide-react';

// const uboSchema = z.object({
//   firstName: z.string().min(2, 'First name is required'),
//   lastName: z.string().min(2, 'Last name is required'),
//   dateOfBirth: z.string().min(1, 'Date of birth is required'),
//   nationality: z.string().min(1, 'Nationality is required'),
//   ownershipPercentage: z.number().min(0.01).max(100),
//   isPEP: z.boolean(),
//   address: z.object({
//     street: z.string().min(5, 'Street address is required'),
//     city: z.string().min(2, 'City is required'),
//     state: z.string().min(2, 'State is required'),
//     postalCode: z.string().min(4, 'Postal code is required'),
//     country: z.string().min(1, 'Country is required'),
//   }),
// });

// const ownershipSchema = z.object({
//   ubos: z.array(uboSchema).min(1, 'At least one UBO is required'),
//   totalOwnership: z.number().max(100, 'Total ownership cannot exceed 100%'),
//   hasOtherBeneficiaries: z.boolean(),
//   ownershipStructureNotes: z.string().optional(),
// });

// interface OwnershipStructureStepProps {
//   onNext: (data: any) => void;
//   onPrevious: () => void;
// }

// const COUNTRIES = [
//   'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 
//   'Japan', 'Australia', 'Singapore', 'Switzerland', 'Other'
// ];

// export function OwnershipStructureStep({ onNext, onPrevious }: OwnershipStructureStepProps) {
//   const form = useForm({
//     resolver: zodResolver(ownershipSchema),
//     defaultValues: {
//       ubos: [{
//         firstName: '',
//         lastName: '',
//         dateOfBirth: '',
//         nationality: '',
//         ownershipPercentage: 25,
//         isPEP: false,
//         address: {
//           street: '',
//           city: '',
//           state: '',
//           postalCode: '',
//           country: '',
//         }
//       }],
//       totalOwnership: 0,
//       hasOtherBeneficiaries: false,
//       ownershipStructureNotes: '',
//     },
//   });

//   const { fields, append, remove } = useFieldArray({
//     control: form.control,
//     name: 'ubos',
//   });

//   const watchUBOs = form.watch('ubos');
//   const totalOwnership = watchUBOs.reduce((sum, ubo) => sum + (ubo.ownershipPercentage || 0), 0);

//   const addUBO = () => {
//     append({
//       firstName: '',
//       lastName: '',
//       dateOfBirth: '',
//       nationality: '',
//       ownershipPercentage: Math.max(0, 100 - totalOwnership),
//       isPEP: false,
//       address: {
//         street: '',
//         city: '',
//         state: '',
//         postalCode: '',
//         country: '',
//       }
//     });
//   };

//   const removeUBO = (index: number) => {
//     if (fields.length > 1) {
//       remove(index);
//     }
//   };

//   const onSubmit = (data: any) => {
//     const ownershipData = {
//       ultimateBeneficialOwners: data.ubos.map((ubo: any, index: number) => ({
//         id: `ubo-${index}`,
//         ...ubo,
//       })),
//       totalOwnership: totalOwnership,
//       hasOtherBeneficiaries: data.hasOtherBeneficiaries,
//       ownershipStructureNotes: data.ownershipStructureNotes,
//     };

//     onNext(ownershipData);
//   };

//   const getOwnershipStatus = () => {
//     if (totalOwnership < 100) return { color: 'text-yellow-600', message: 'Incomplete' };
//     if (totalOwnership > 100) return { color: 'text-red-600', message: 'Exceeds 100%' };
//     return { color: 'text-green-600', message: 'Complete' };
//   };

//   const ownershipStatus = getOwnershipStatus();

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//         {/* Header */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Users className="w-5 h-5" />
//               Ultimate Beneficial Owners (UBOs)
//             </CardTitle>
//           </CardHeader>
//           <CardContent>
//             <Alert>
//               <Shield className="h-4 w-4" />
//               <AlertDescription>
//                 <strong>UBO Definition:</strong> Any individual who owns 25% or more of the company's shares or voting rights, 
//                 or exercises control over the company through other means.
//               </AlertDescription>
//             </Alert>
//           </CardContent>
//         </Card>

//         {/* Ownership Summary */}
//         <Card className="border-l-4 border-l-primary">
//           <CardContent className="p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold">Ownership Summary</h3>
//                 <p className="text-sm text-gray-600">Total declared ownership percentage</p>
//               </div>
//               <div className="text-right">
//                 <div className="text-3xl font-bold flex items-center gap-2">
//                   {totalOwnership.toFixed(1)}%
//                   <Badge variant={totalOwnership === 100 ? "default" : "secondary"} className={ownershipStatus.color}>
//                     {ownershipStatus.message}
//                   </Badge>
//                 </div>
//                 <p className="text-sm text-gray-500">{fields.length} UBO(s) declared</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* UBO Forms */}
//         <div className="space-y-6">
//           {fields.map((field, index) => (
//             <Card key={field.id} className="relative">
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-lg">
//                     Ultimate Beneficial Owner #{index + 1}
//                   </CardTitle>
//                   <div className="flex items-center gap-2">
//                     <Badge variant="outline">
//                       {watchUBOs[index]?.ownershipPercentage || 0}% ownership
//                     </Badge>
//                     {fields.length > 1 && (
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         size="sm"
//                         onClick={() => removeUBO(index)}
//                         className="text-red-600 hover:text-red-700"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </Button>
//                     )}
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 {/* Personal Information */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`ubos.${index}.firstName`}
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
//                     name={`ubos.${index}.lastName`}
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
//                   <FormField
//                     control={form.control}
//                     name={`ubos.${index}.dateOfBirth`}
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
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <FormField
//                     control={form.control}
//                     name={`ubos.${index}.nationality`}
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
//                   <FormField
//                     control={form.control}
//                     name={`ubos.${index}.ownershipPercentage`}
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel>Ownership Percentage *</FormLabel>
//                         <FormControl>
//                           <Input 
//                             type="number" 
//                             min="0.01" 
//                             max="100" 
//                             step="0.01"
//                             placeholder="25.00"
//                             {...field}
//                             onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
//                           />
//                         </FormControl>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                   <div className="flex items-center space-x-2 mt-8">
//                     <FormField
//                       control={form.control}
//                       name={`ubos.${index}.isPEP`}
//                       render={({ field }) => (
//                         <FormItem className="flex flex-row items-center space-x-3 space-y-0">
//                           <FormControl>
//                             <Checkbox
//                               checked={field.value}
//                               onCheckedChange={field.onChange}
//                             />
//                           </FormControl>
//                           <FormLabel className="text-sm font-normal">
//                             Politically Exposed Person (PEP)
//                           </FormLabel>
//                         </FormItem>
//                       )}
//                     />
//                   </div>
//                 </div>

//                 {/* Address */}
//                 <div className="space-y-4 border-t pt-4">
//                   <h4 className="font-medium text-gray-900">Address Information</h4>
//                   <FormField
//                     control={form.control}
//                     name={`ubos.${index}.address.street`}
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
//                       name={`ubos.${index}.address.city`}
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
//                       name={`ubos.${index}.address.state`}
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
//                       name={`ubos.${index}.address.postalCode`}
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
//                       name={`ubos.${index}.address.country`}
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

//         {/* Add UBO Button */}
//         <div className="flex justify-center">
//           <Button
//             type="button"
//             variant="outline"
//             onClick={addUBO}
//             className="flex items-center gap-2"
//             disabled={totalOwnership >= 100}
//           >
//             <Plus className="w-4 h-4" />
//             Add Another UBO
//           </Button>
//         </div>

//         {/* Ownership Validation */}
//         {totalOwnership !== 100 && (
//           <Alert variant={totalOwnership > 100 ? "destructive" : "default"}>
//             <AlertTriangle className="h-4 w-4" />
//             <AlertDescription>
//               {totalOwnership > 100 
//                 ? `Total ownership exceeds 100% by ${(totalOwnership - 100).toFixed(1)}%. Please adjust the percentages.`
//                 : `Total ownership is ${totalOwnership.toFixed(1)}%. ${totalOwnership < 100 ? 'Please ensure all beneficial owners are declared.' : ''}`
//               }
//             </AlertDescription>
//           </Alert>
//         )}

//         <div className="flex justify-between pt-6">
//           <Button variant="outline" onClick={onPrevious}>
//             Previous
//           </Button>
//           <Button 
//             type="submit" 
//             className="px-8"
//             disabled={totalOwnership > 100}
//           >
//             Continue to Authorized Representatives
//           </Button>
//         </div>
//       </form>
//     </Form>
//   );
// }
