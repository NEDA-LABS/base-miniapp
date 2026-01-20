import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Progress } from "../ui/progress";
import {
  Clock,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ApplicationDetailView } from "./ApplicationDetailView";

export function VerificationQueue() {
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [selectedApplicationType, setSelectedApplicationType] = useState<
    "KYC" | "KYB" | null
  >(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [stats, setStats] = useState({
    itemsInQueue: 0,
    processing: 0,
    avgTime: 0,
  });

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await fetch(
          "/api/kyc/admin/applications?status=SUBMITTED"
        );
        const data = await response.json();
        setQueueItems(data);

        // Calculate stats (simplified)
        setStats({
          itemsInQueue: data.length,
          processing: 0, // This would come from backend
          avgTime: 28, // Placeholder
        });
      } catch (error) {
        console.error("Error fetching queue:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriority = (riskLevel: string) => {
    switch (riskLevel) {
      case "HIGH":
        return "HIGH";
      case "MEDIUM":
        return "MEDIUM";
      default:
        return "LOW";
    }
  };

  const calculateProgress = (application: any) => {
    // Simplified progress calculation
    if (application.status === "SUBMITTED") return 30;
    if (application.documents?.length > 0) return 60;
    return 10;
  };

  if (loading) {
    return <div>Loading verification queue...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Verification Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Queue Status:</strong> {stats.itemsInQueue} items in
              queue,
              {stats.processing} currently being processed, average processing
              time: {stats.avgTime} minutes
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {queueItems.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        {item.type === "KYC" ? (
                          <User className="w-6 h-6 text-primary" />
                        ) : (
                          <Building className="w-6 h-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">
                          {item.firstName || item.businessName}
                          {item.lastName ? ` ${item.lastName}` : ""}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.type}</Badge>
                          <Badge
                            className={getPriorityColor(
                              getPriority(item.riskLevel)
                            )}
                          >
                            {getPriority(item.riskLevel)} Priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Est. Time:{" "}
                        {item.riskLevel === "HIGH" ? "45 mins" : "20 mins"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted:{" "}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Verification Progress</span>
                        <span>{calculateProgress(item)}%</span>
                      </div>
                      <Progress
                        value={calculateProgress(item)}
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        Awaiting assignment
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApplicationId(item.id);
                            setSelectedApplicationType(
                              item.type as "KYC" | "KYB"
                            );
                            setIsDetailOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                        {/* <Button size="sm">Assign to Me</Button> */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      {selectedApplicationId && selectedApplicationType && (
        <div className="">
        <ApplicationDetailView
          applicationId={selectedApplicationId}
          type={selectedApplicationType}
          open={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAction={(action, notes) => {
            // Handle action if needed
            console.log(
              `Action: ${action} on application ${selectedApplicationId}`
            );
            // Refresh queue after action
            const updatedQueue = queueItems.filter(
              (item) => item.id !== selectedApplicationId
            );
            setQueueItems(updatedQueue);
          }}
        />
        </div>
      )}
    </div>
  );
}
