import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, Trash2, Plus, Eye, EyeOff, Copy, Settings, Lock, LogOut } from "lucide-react";
import { format } from "date-fns";

interface ApiKey {
  id: number;
  key_id: string;
  name: string;
  is_active: boolean;
  rate_limit_per_hour: number;
  created_at: string;
  usage_today: number;
}

interface CreateApiKeyResponse {
  success: boolean;
  data: ApiKey & { api_key: string };
}

export default function Admin() {
  const [adminToken, setAdminToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check for stored admin token on component mount
  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");
    if (storedToken) {
      setAdminToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Admin authentication functions
  const handleAdminLogin = async () => {
    if (!adminToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter an admin token",
        variant: "destructive",
      });
      return;
    }

    try {
      // Test admin token by making a simple request
      const response = await apiRequest("GET", "/api/keys", undefined, adminToken);
      await response.json();
      
      // Store token and mark as authenticated
      localStorage.setItem("adminToken", adminToken);
      setIsAuthenticated(true);
      toast({
        title: "Success",
        description: "Admin authentication successful",
      });
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid admin token. Please check your credentials.",
        variant: "destructive",
      });
      setAdminToken("");
      setIsAuthenticated(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("adminToken");
    setAdminToken("");
    setIsAuthenticated(false);
    queryClient.clear();
    toast({
      title: "Logged Out",
      description: "Admin session ended",
    });
  };

  // Fetch API keys (only when authenticated)
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["/api/keys"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/keys", undefined, adminToken);
      const result = await response.json();
      return result.data as ApiKey[];
    }
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; rate_limit_per_hour: number }) => {
      const response = await apiRequest("POST", "/api/keys", data, adminToken);
      return response.json() as Promise<CreateApiKeyResponse>;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
        setNewKeyName("");
        setNewKeyRateLimit(100);
        toast({
          title: "Success",
          description: "API key created successfully. Make sure to copy it now!",
        });
        // Show the secret for the newly created key
        setShowSecrets(prev => new Set([...Array.from(prev), data.data.key_id]));
      } else {
        toast({
          title: "Error",
          description: "Failed to create API key",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("DELETE", `/api/keys/${keyId}`, undefined, adminToken);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    createKeyMutation.mutate({
      name: newKeyName.trim(),
      rate_limit_per_hour: newKeyRateLimit,
    });
  };

  const toggleSecretVisibility = (keyId: string) => {
    setShowSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getSecretDisplay = (keyId: string, apiKey?: string) => {
    if (!apiKey) return "••••••••••••••••••••••••••••••••";
    if (showSecrets.has(keyId)) return apiKey;
    return "••••••••••••••••••••••••••••••••";
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Admin Authentication
            </CardTitle>
            <p className="text-muted-foreground">Enter admin token to access API key management</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="adminToken" className="block text-sm font-medium text-foreground mb-2">
                  Admin Token
                </label>
                <Input
                  id="adminToken"
                  type="password"
                  placeholder="Enter admin token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  data-testid="input-admin-token"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAdminLogin();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAdminLogin}
                className="w-full"
                data-testid="button-admin-login"
              >
                <Lock className="mr-2 h-4 w-4" />
                Authenticate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">API Key Management</h1>
            <p className="text-muted-foreground">Manage your YouTube Downloader API keys and monitor usage</p>
          </div>
          <Button 
            onClick={handleAdminLogout}
            variant="outline"
            data-testid="button-admin-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Create New API Key */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Create New API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="keyName" className="block text-sm font-medium text-foreground mb-2">
                    Key Name
                  </label>
                  <Input
                    id="keyName"
                    type="text"
                    placeholder="e.g., Production API, Development Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    data-testid="input-api-key-name"
                  />
                </div>
                <div>
                  <label htmlFor="rateLimit" className="block text-sm font-medium text-foreground mb-2">
                    Rate Limit (requests/hour)
                  </label>
                  <Input
                    id="rateLimit"
                    type="number"
                    min="1"
                    max="10000"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                    data-testid="input-rate-limit"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateKey}
                disabled={createKeyMutation.isPending}
                data-testid="button-create-api-key"
              >
                {createKeyMutation.isPending ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Your API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading API keys...</p>
              </div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No API keys found. Create your first one above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => {
                  const isNewKey = createKeyMutation.data?.data?.key_id === key.key_id;
                  const apiKeySecret = isNewKey ? createKeyMutation.data?.data?.api_key : undefined;
                  
                  return (
                    <div
                      key={key.id}
                      className="border border-border rounded-lg p-4 bg-card"
                      data-testid={`api-key-${key.key_id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-foreground" data-testid={`text-key-name-${key.key_id}`}>
                              {key.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              key.is_active 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}>
                              {key.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-4">
                              <span>Rate Limit: {key.rate_limit_per_hour}/hour</span>
                              <span>Usage Today: {key.usage_today}</span>
                              <span>Created: {format(new Date(key.created_at), "MMM d, yyyy")}</span>
                            </div>
                            
                            {/* API Key Display */}
                            <div className="flex items-center space-x-2 bg-secondary p-2 rounded">
                              <code className="flex-1 text-xs font-mono" data-testid={`text-api-key-${key.key_id}`}>
                                {getSecretDisplay(key.key_id, apiKeySecret)}
                              </code>
                              <div className="flex items-center space-x-1">
                                {apiKeySecret && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => toggleSecretVisibility(key.key_id)}
                                      data-testid={`button-toggle-secret-${key.key_id}`}
                                    >
                                      {showSecrets.has(key.key_id) ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => copyToClipboard(apiKeySecret, key.key_id)}
                                      data-testid={`button-copy-key-${key.key_id}`}
                                    >
                                      <Copy className={`h-4 w-4 ${copiedKey === key.key_id ? "text-green-600" : ""}`} />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {isNewKey && (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                                <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                                  ⚠️ This is your only chance to copy this API key. It won't be shown again.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteKeyMutation.mutate(key.key_id)}
                            disabled={deleteKeyMutation.isPending}
                            data-testid={`button-delete-key-${key.key_id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              How to Use Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-2">Authentication</h4>
                <p className="text-muted-foreground mb-2">Include your API key in the request headers:</p>
                <code className="block bg-secondary p-3 rounded text-xs">
                  X-API-Key: your_api_key_here
                </code>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Example Usage</h4>
                <code className="block bg-secondary p-3 rounded text-xs whitespace-pre-wrap">
{`curl -X POST https://your-domain.com/api/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'`}
                </code>
              </div>
              
              <div>
                <h4 className="font-medium text-foreground mb-2">Rate Limits</h4>
                <p className="text-muted-foreground">
                  Each API key has its own rate limit. Exceeding the limit will result in a 429 status code. 
                  The API also supports public access without authentication, but authenticated requests get higher priority.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}