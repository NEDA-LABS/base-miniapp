
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { Button } from '../../ui/button';
// import { Input } from '../../ui/input';
// import { Textarea } from '../../ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../../ui/form';
// import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
// import { Checkbox } from '../../ui/checkbox';
// import { Alert, AlertDescription } from '../../ui/alert';
// import { FinancialInfo } from '../../../types/kyc';
// import { DollarSign, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

// const financialInfoSchema = z.object({
//   sourceOfFunds: z.string().min(1, 'Source of funds is required'),
//   sourceOfFundsDetails: z.string().optional(),
//   expectedTransactionVolume: z.string().min(1, 'Expected transaction volume is required'),
//   employmentStatus: z.string().min(1, 'Employment status is required'),
//   annualIncome: z.string().optional(),
//   employer: z.string().optional(),
//   industry: z.string().optional(),
//   isPEP: z.boolean(),
//   pepDetails: z.string().optional(),
//   hasAccountsOtherJurisdictions: z.boolean(),
//   otherAccountsDetails: z.string().optional(),
// });

// interface FinancialInfoStepProps {
//   onNext: (data: FinancialInfo) => void;
//   onPrevious: () => void;
//   initialData?: Partial<FinancialInfo>;
// }

// const SOURCE_OF_FUNDS = [
//   'Employment/Salary',
//   'Business Income',
//   'Investment Returns',
//   'Inheritance',
//   'Gift',
//   'Sale of Property',
//   'Pension/Retirement',
//   'Government Benefits',
//   'Other'
// ];

// const TRANSACTION_VOLUMES = [
//   'Less than $10,000',
//   '$10,000 - $50,000',
//   '$50,000 - $100,000',
//   '$100,000 - $500,000',
//   '$500,000 - $1,000,000',
//   'More than $1,000,000'
// ];

// const EMPLOYMENT_STATUS = [
//   'Employed',
//   'Self-Employed',
//   'Unemployed',
//   'Student',
//   'Retired',
//   'Other'
// ];

// const ANNUAL_INCOME = [
//   'Less than $25,000',
//   '$25,000 - $50,000',
//   '$50,000 - $100,000',
//   '$100,000 - $250,000',
//   '$250,000 - $500,000',
//   'More than $500,000'
// ];

// export function FinancialInfoStep({ onNext, onPrevious, initialData }: FinancialInfoStepProps) {
//   type ExtendedFinancialInfo = FinancialInfo & {
//     sourceOfFundsDetails?: string;
//     pepDetails?: string;
//     hasAccountsOtherJurisdictions: boolean; // Make this required
//     otherAccountsDetails?: string;
//     employer?: string;
//     industry?: string;
//   };

//   const form = useForm<ExtendedFinancialInfo>({
//     resolver: zodResolver(financialInfoSchema as z.ZodSchema<ExtendedFinancialInfo>),
//     defaultValues: {
//       sourceOfFunds: initialData?.sourceOfFunds || '',
//       expectedTransactionVolume: initialData?.expectedTransactionVolume || '',
//       employmentStatus: initialData?.employmentStatus || '',
//       annualIncome: initialData?.annualIncome || '',
//       isPEP: initialData?.isPEP || false,
//       hasAccountsOtherJurisdictions: false,
//       ...initialData,
//     },
//   });

//   const watchSourceOfFunds = form.watch('sourceOfFunds');
//   const watchEmploymentStatus = form.watch('employmentStatus');
//   const watchIsPEP = form.watch('isPEP');
//   const watchHasOtherAccounts = form.watch('hasAccountsOtherJurisdictions');

//   const onSubmit = (data: any) => {
//     const financialData: FinancialInfo = {
//       sourceOfFunds: data.sourceOfFunds,
//       expectedTransactionVolume: data.expectedTransactionVolume,
//       employmentStatus: data.employmentStatus,
//       annualIncome: data.annualIncome,
//       isPEP: data.isPEP,
//     };

//     onNext(financialData);
//   };

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//         {/* Source of Funds */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <DollarSign className="w-5 h-5" />
//               Source of Funds
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <FormField
//               control={form.control}
//               name="sourceOfFunds"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Primary Source of Funds *</FormLabel>
//                   <Select onValueChange={field.onChange} defaultValue={field.value}>
//                     <FormControl>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Select source of funds" />
//                       </SelectTrigger>
//                     </FormControl>
//                     <SelectContent>
//                       {SOURCE_OF_FUNDS.map((source) => (
//                         <SelectItem key={source} value={source}>
//                           {source}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />

//             {watchSourceOfFunds === 'Other' && (
//               <FormField
//                 control={form.control}
//                 name="sourceOfFundsDetails"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Please specify</FormLabel>
//                     <FormControl>
//                       <Textarea 
//                         placeholder="Please provide details about your source of funds"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             )}

//             <FormField
//               control={form.control}
//               name="expectedTransactionVolume"
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Expected Monthly Transaction Volume *</FormLabel>
//                   <Select onValueChange={field.onChange} defaultValue={field.value}>
//                     <FormControl>
//                       <SelectTrigger>
//                         <SelectValue placeholder="Select expected volume" />
//                       </SelectTrigger>
//                     </FormControl>
//                     <SelectContent>
//                       {TRANSACTION_VOLUMES.map((volume) => (
//                         <SelectItem key={volume} value={volume}>
//                           {volume}
//                         </SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />
//           </CardContent>
//         </Card>

//         {/* Employment Information */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <TrendingUp className="w-5 h-5" />
//               Employment Information
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <FormField
//                 control={form.control}
//                 name="employmentStatus"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Employment Status *</FormLabel>
//                     <Select onValueChange={field.onChange} defaultValue={field.value}>
//                       <FormControl>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select employment status" />
//                         </SelectTrigger>
//                       </FormControl>
//                       <SelectContent>
//                         {EMPLOYMENT_STATUS.map((status) => (
//                           <SelectItem key={status} value={status}>
//                             {status}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               <FormField
//                 control={form.control}
//                 name="annualIncome"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Annual Income (Optional)</FormLabel>
//                     <Select onValueChange={field.onChange} defaultValue={field.value}>
//                       <FormControl>
//                         <SelectTrigger>
//                           <SelectValue placeholder="Select income range" />
//                         </SelectTrigger>
//                       </FormControl>
//                       <SelectContent>
//                         {ANNUAL_INCOME.map((income) => (
//                           <SelectItem key={income} value={income}>
//                             {income}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>

//             {(watchEmploymentStatus === 'Employed' || watchEmploymentStatus === 'Self-Employed') && (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <FormField
//                   control={form.control}
//                   name="employer"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>
//                         {watchEmploymentStatus === 'Self-Employed' ? 'Business Name' : 'Employer Name'}
//                       </FormLabel>
//                       <FormControl>
//                         <Input placeholder="Enter name" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />

//                 <FormField
//                   control={form.control}
//                   name="industry"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel>Industry/Sector</FormLabel>
//                       <FormControl>
//                         <Input placeholder="e.g., Technology, Finance, Healthcare" {...field} />
//                       </FormControl>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* PEP and Compliance */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center gap-2">
//               <Shield className="w-5 h-5" />
//               Compliance Information
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <FormField
//               control={form.control}
//               name="isPEP"
//               render={({ field }) => (
//                 <FormItem className="flex flex-row items-start space-x-3 space-y-0">
//                   <FormControl>
//                     <Checkbox
//                       checked={field.value}
//                       onCheckedChange={field.onChange}
//                     />
//                   </FormControl>
//                   <div className="space-y-1 leading-none">
//                     <FormLabel>
//                       I am a Politically Exposed Person (PEP)
//                     </FormLabel>
//                     <FormDescription>
//                       A PEP is an individual who is or has been entrusted with a prominent public function
//                     </FormDescription>
//                   </div>
//                 </FormItem>
//               )}
//             />

//             {watchIsPEP && (
//               <Alert>
//                 <AlertTriangle className="h-4 w-4" />
//                 <AlertDescription>
//                   As a PEP, additional documentation and enhanced due diligence procedures may be required.
//                 </AlertDescription>
//               </Alert>
//             )}

//             <FormField
//               control={form.control}
//               name="hasAccountsOtherJurisdictions"
//               render={({ field }) => (
//                 <FormItem className="flex flex-row items-start space-x-3 space-y-0">
//                   <FormControl>
//                     <Checkbox
//                       checked={field.value}
//                       onCheckedChange={field.onChange}
//                     />
//                   </FormControl>
//                   <div className="space-y-1 leading-none">
//                     <FormLabel>
//                       I have financial accounts in other jurisdictions
//                     </FormLabel>
//                     <FormDescription>
//                       Please check if you maintain accounts outside your country of residence
//                     </FormDescription>
//                   </div>
//                 </FormItem>
//               )}
//             />

//             {watchHasOtherAccounts && (
//               <FormField
//                 control={form.control}
//                 name="otherAccountsDetails"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Other Accounts Details</FormLabel>
//                     <FormControl>
//                       <Textarea 
//                         placeholder="Please provide details about accounts in other jurisdictions"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             )}
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
