// import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
// import { Button } from '../ui/button';
// import { Badge } from '../ui/badge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
// import { BarChart3, FileText, Download, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

// const MOCK_REPORTS = [
//   {
//     id: '1',
//     title: 'Monthly KYC Summary',
//     type: 'KYC_SUMMARY',
//     period: 'January 2024',
//     status: 'Generated',
//     fileSize: '2.3 MB',
//     generatedAt: '2024-01-31T23:59:00Z',
//     stats: {
//       totalApplications: 156,
//       approved: 142,
//       rejected: 14,
//       pending: 0
//     }
//   },
//   {
//     id: '2',
//     title: 'KYB Compliance Report',
//     type: 'KYB_COMPLIANCE',
//     period: 'Q4 2023',
//     status: 'Generated',
//     fileSize: '5.7 MB',
//     generatedAt: '2024-01-15T10:30:00Z',
//     stats: {
//       totalApplications: 43,
//       approved: 38,
//       rejected: 3,
//       pending: 2
//     }
//   },
//   {
//     id: '3',
//     title: 'Risk Assessment Summary',
//     type: 'RISK_ASSESSMENT',
//     period: 'December 2023',
//     status: 'Generating',
//     fileSize: null,
//     generatedAt: null,
//     stats: null
//   }
// ];

// const RISK_METRICS = [
//   { label: 'High Risk Customers', value: 12, change: '+2', trend: 'up' },
//   { label: 'PEP Customers', value: 8, change: '0', trend: 'stable' },
//   { label: 'Sanctions Matches', value: 0, change: '0', trend: 'stable' },
//   { label: 'Failed Verifications', value: 23, change: '-5', trend: 'down' }
// ];

// export function ComplianceReports() {
//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleString();
//   };

//   const getTrendIcon = (trend: string) => {
//     switch (trend) {
//       case 'up':
//         return <TrendingUp className="w-4 h-4 text-red-500" />;
//       case 'down':
//         return <TrendingUp className="w-4 h-4 text-green-500 rotate-180" />;
//       default:
//         return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Risk Metrics */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         {RISK_METRICS.map((metric, index) => (
//           <Card key={index}>
//             <CardContent className="p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm text-gray-600">{metric.label}</p>
//                   <div className="flex items-center gap-2 mt-1">
//                     <p className="text-2xl font-bold">{metric.value}</p>
//                     <div className="flex items-center gap-1 text-sm">
//                       {getTrendIcon(metric.trend)}
//                       <span className={
//                         metric.trend === 'up' ? 'text-red-600' :
//                         metric.trend === 'down' ? 'text-green-600' :
//                         'text-gray-600'
//                       }>
//                         {metric.change}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//                 <AlertTriangle className="w-8 h-8 text-orange-500" />
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Report Generation */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <BarChart3 className="w-5 h-5" />
//             Generate New Report
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
//             <div>
//               <label className="text-sm font-medium mb-2 block">Report Type</label>
//               <Select>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select report type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="kyc_summary">KYC Summary</SelectItem>
//                   <SelectItem value="kyb_compliance">KYB Compliance</SelectItem>
//                   <SelectItem value="risk_assessment">Risk Assessment</SelectItem>
//                   <SelectItem value="audit_trail">Audit Trail</SelectItem>
//                   <SelectItem value="sanctions_screening">Sanctions Screening</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <label className="text-sm font-medium mb-2 block">Period</label>
//               <Select>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select period" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="last_7_days">Last 7 Days</SelectItem>
//                   <SelectItem value="last_30_days">Last 30 Days</SelectItem>
//                   <SelectItem value="last_quarter">Last Quarter</SelectItem>
//                   <SelectItem value="last_year">Last Year</SelectItem>
//                   <SelectItem value="custom">Custom Range</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <label className="text-sm font-medium mb-2 block">Format</label>
//               <Select>
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select format" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="pdf">PDF</SelectItem>
//                   <SelectItem value="excel">Excel</SelectItem>
//                   <SelectItem value="csv">CSV</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <Button className="w-full">
//               <FileText className="w-4 h-4 mr-2" />
//               Generate Report
//             </Button>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Existing Reports */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <FileText className="w-5 h-5" />
//             Generated Reports
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             {MOCK_REPORTS.map((report) => (
//               <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-4">
//                     <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                       <FileText className="w-6 h-6 text-blue-600" />
//                     </div>
//                     <div>
//                       <h4 className="font-semibold">{report.title}</h4>
//                       <p className="text-sm text-gray-600">Period: {report.period}</p>
//                       {report.generatedAt && (
//                         <p className="text-xs text-gray-500">
//                           Generated: {formatDate(report.generatedAt)}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4">
//                     {report.stats && (
//                       <div className="text-right text-sm">
//                         <p className="text-gray-600">
//                           {report.stats.totalApplications} total, {report.stats.approved} approved
//                         </p>
//                         <p className="text-gray-500">
//                           {report.stats.rejected} rejected, {report.stats.pending} pending
//                         </p>
//                       </div>
//                     )}
//                     <div className="flex items-center gap-2">
//                       <Badge 
//                         variant={report.status === 'Generated' ? 'default' : 'secondary'}
//                       >
//                         {report.status}
//                       </Badge>
//                       {report.fileSize && (
//                         <span className="text-xs text-gray-500">{report.fileSize}</span>
//                       )}
//                       {report.status === 'Generated' && (
//                         <Button size="sm" variant="outline">
//                           <Download className="w-4 h-4 mr-2" />
//                           Download
//                         </Button>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
