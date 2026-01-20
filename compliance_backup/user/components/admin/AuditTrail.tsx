
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Search, Shield, User, Building, FileText, Download, Filter } from 'lucide-react';

const ACTION_TYPES = [
  'KYC_APPROVED',
  'KYC_REJECTED',
  'KYB_APPROVED',
  'KYB_REJECTED',
  'DOCUMENT_UPLOADED',
  'SANCTIONS_CHECK',
  'LOGIN_ATTEMPT',
  'PROFILE_UPDATED'
];

export function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const params = new URLSearchParams();
        if (filterAction !== 'all') params.append('action', filterAction);
        if (filterUser !== 'all') params.append('user', filterUser);
        if (searchTerm) params.append('search', searchTerm);
        
        const response = await fetch(`/api/admin/audit?${params.toString()}`);
        const data = await response.json();
        setAuditEvents(data);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchAuditLogs();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, filterAction, filterUser]);

  const getActionIcon = (action: string) => {
    if (action.includes('KYC') || action.includes('KYB')) {
      return action.includes('KYC') ? <User className="w-4 h-4" /> : <Building className="w-4 h-4" />;
    }
    if (action.includes('DOCUMENT')) {
      return <FileText className="w-4 h-4" />;
    }
    if (action.includes('SANCTIONS') || action.includes('CHECK')) {
      return <Shield className="w-4 h-4" />;
    }
    return <Shield className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-green-100 text-green-800';
    if (action.includes('REJECTED')) return 'bg-red-100 text-red-800';
    if (action.includes('UPLOADED')) return 'bg-blue-100 text-blue-800';
    if (action.includes('CHECK')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div>Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search audit events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTION_TYPES.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="Agent Smith">Agent Smith</SelectItem>
                <SelectItem value="Agent Johnson">Agent Johnson</SelectItem>
                <SelectItem value="Agent Brown">Agent Brown</SelectItem>
                <SelectItem value="System">System</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Audit Trail ({auditEvents.length} events)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditEvents.map((event) => (
              <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mt-1">
                      {getActionIcon(event.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionColor(event.action)}>
                          {event.action.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={getRiskColor(event.riskLevel)}>
                          {event.riskLevel} Risk
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-lg mb-1">{event.subject}</h4>
                      <p className="text-gray-600 mb-2">{event.details}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>User: {event.user}</span>
                        <span>IP: {event.ipAddress}</span>
                        <span>Time: {formatDate(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Technical Details (Collapsible) */}
                <details className="mt-3">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm space-y-1">
                    <div><strong>User Agent:</strong> {event.userAgent}</div>
                    <div><strong>Timestamp:</strong> {event.timestamp}</div>
                    <div><strong>Event ID:</strong> {event.id}</div>
                  </div>
                </details>
              </div>
            ))}
          </div>

          {auditEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No audit events found matching your filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
