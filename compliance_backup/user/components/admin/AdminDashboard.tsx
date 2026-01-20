"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Input } from "../ui/input";
import { usePrivy } from "@privy-io/react-auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { VerificationQueue } from "./VerificationQueue";
// import { ComplianceReports } from './ComplianceReports';
import { AuditTrail } from "./AuditTrail";
import { ApplicationDetailView } from "./ApplicationDetailView";
import { VerificationStatus, RiskLevel } from "../../types/kyc";
import {
  Users,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Shield,
  Search,
  Filter,
} from "lucide-react";
import "../../kyc.css"

interface AdminDashboardProps {
  onVerificationAction?: (
    id: string,
    action: "approve" | "reject" | "request_info",
    notes?: string
  ) => void;
}

export function AdminDashboard({ onVerificationAction }: AdminDashboardProps) {
  const { user } = usePrivy();
  const adminAddress = user?.wallet?.address;
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [stats, setStats] = useState<any>(null);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedApplicationType, setSelectedApplicationType] = useState<
    "KYC" | "KYB" | null
  >(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/kyc/admin/stats");
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    const fetchApplications = async () => {
      try {
        const response = await fetch(
          `/api/kyc/admin/applications?status=SUBMITTED`
        );
        const data = await response.json();
        setPendingVerifications(data);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchApplications();
  }, []);

  const handleVerificationAction = async (
    id: string,
    action: "approve" | "reject"
  ) => {
    try {
      const reviewerAddress = user?.wallet?.address;
      const response = await fetch(`/api/admin/applications/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewerAddress }),
      });

      if (response.ok) {
        // Refresh applications after action
        const updatedApps = pendingVerifications.filter((app) => app.id !== id);
        setPendingVerifications(updatedApps);

        // Optional: Call parent component handler if needed
        if (onVerificationAction) {
          onVerificationAction(id, action);
        }
      }
    } catch (error) {
      console.error("Error processing action:", error);
    }
  };

  const getRiskBadgeColor = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW:
        return "bg-green-100 text-green-800";
      case RiskLevel.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case RiskLevel.HIGH:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading || !stats) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage KYC/KYB verifications</p>
        </div>
        {/* <div className="flex gap-2">
          <Button variant="outline">
            <Shield className="w-4 h-4 mr-2" />
            Run Compliance Scan
          </Button>
          <Button>
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 bg-white rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Verifications</p>
                <p className="text-2xl font-bold">{stats.totalVerifications}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending KYC</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendingKYC}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending KYB</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.pendingKYB}
                </p>
              </div>
              <Building className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completedToday}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected Today</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.rejectedToday}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk Cases</p>
                <p className="text-2xl font-bold text-red-600">{stats.highRiskCases}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Verifications</TabsTrigger>
          <TabsTrigger value="queue">Verification Queue</TabsTrigger>
          <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="KYC">KYC</SelectItem>
                    <SelectItem value="KYB">KYB</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pending Verifications Table */}

          <Card>
            <CardHeader>
              <CardTitle>Pending Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingVerifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="border rounded-lg p-4 hover:!bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          {verification.type === "KYC" ? (
                            <Users className="w-6 h-6 text-gray-600" />
                          ) : (
                            <Building className="w-6 h-6 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold">
                            {verification.firstName ||
                              verification.businessName}
                            {verification.lastName
                              ? ` ${verification.lastName}`
                              : ""}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {verification.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            Submitted:{" "}
                            {formatDate(
                              verification.submittedAt || verification.createdAt
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{verification.type}</Badge>
                        <Badge
                          className={getRiskBadgeColor(verification.riskLevel)}
                        >
                          {verification.riskLevel} Risk
                        </Badge>
                        <Badge variant="secondary">
                          {verification.documents?.length || 0} docs
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApplicationId(verification.id);
                              setSelectedApplicationType(
                                verification.type as "KYC" | "KYB"
                              );
                              setIsDetailOpen(true);
                            }}
                          >
                            Review
                          </Button>
                          {/* <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              handleVerificationAction(
                                verification.id,
                                "approve"
                              )
                            }
                          >
                            Approve
                          </Button> */}
                          {/* <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              handleVerificationAction(
                                verification.id,
                                "reject"
                              )
                            }
                          >
                            Reject
                          </Button> */}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <VerificationQueue />
        </TabsContent>

        {/* <TabsContent value="reports">
          <ComplianceReports />
        </TabsContent> */}

        <TabsContent value="audit">
          <AuditTrail />
        </TabsContent>
      </Tabs>
      {selectedApplicationId && selectedApplicationType && (
  <ApplicationDetailView
    applicationId={selectedApplicationId}
    type={selectedApplicationType}
    open={isDetailOpen}
    onClose={() => setIsDetailOpen(false)}
    onAction={async (action, notes) => {
      try {
        const response = await fetch(`/api/kyc/admin/applications/${selectedApplicationId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, notes, adminAddress })
        });

        if (response.ok) {
          // Refresh applications after action
          const updatedApps = pendingVerifications.filter(app => app.id !== selectedApplicationId);
          setPendingVerifications(updatedApps);
          
          // Optional: Call parent component handler if needed
          if (onVerificationAction) {
            onVerificationAction(selectedApplicationId, action, notes);
          }
        }
      } catch (error) {
        console.error('Error processing action:', error);
      }
    }}
  />
)}
    </div>
  );
}
