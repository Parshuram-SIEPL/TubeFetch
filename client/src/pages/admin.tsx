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

  // check for stored token
  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");
    if (storedToken) {
      setAdminToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

 // Admin authentication functions
const handleAdminLogin = async () => {
  // token ko clean karna (trim aur Bearer remove karna)
  let cleanedToken = adminToken.trim();
  if (cleanedToken.toLowerCase().startsWith("bearer ")) {
    cleanedToken = cleanedToken.slice(7).trim();
  }

  if (!cleanedToken) {
    toast({
      title: "Error",
      description: "Please enter an admin token",
      variant: "destructive",
    });
    return;
  }

  try {
    // Test admin token by making a simple request
    const response = await apiRequest("GET", "/api/keys", undefined, cleanedToken);
    await response.json();

    // Store token and mark as authenticated
    localStorage.setItem("adminToken", cleanedToken);
    setAdminToken(cleanedToken);
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
    toast({ title: "Logged Out", description: "Admin session ended" });
  };

  // fetch API keys
  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ["/api/keys"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/keys", undefined, adminToken);
      const result = await response.json();
      return result.data as ApiKey[];
    },
  });

  // create API key
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
          description: "API key created successfully. Copy it now!",
        });
        setShowSecrets(prev => new Set([...prev, data.data.key_id]));
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

  // delete API key
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("DELETE", `/api/keys/${keyId}`, undefined, adminToken);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({ title: "Success", description: "API key deleted successfully" });
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
      const n = new Set(prev);
      n.has(keyId) ? n.delete(keyId) : n.add(keyId);
      return n;
    });
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast({ title: "Copied", description: "API key copied to clipboard" });
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getSecretDisplay = (keyId: string, apiKey?: string) => {
    if (!apiKey) return "••••••••••••••••••••••••••••••••";
    return showSecrets.has(keyId) ? apiKey : "••••••••••••••••••••••••••••••••";
  };

  // login page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Admin Authentication
            </CardTitle>
            <p className="text-muted-foreground">Enter admin token</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="adminToken" className="block text-sm font-medium mb-2">
                  Admin Token
                </label>
                <Input
                  id="adminToken"
                  type="password"
                  placeholder="Enter admin token"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                />
              </div>
              <Button onClick={handleAdminLogin} className="w-full">
                <Lock className="mr-2 h-4 w-4" /> Authenticate
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // admin dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">API Key Management</h1>
            <p className="text-muted-foreground">Manage your API keys and usage</p>
          </div>
          <Button onClick={handleAdminLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Create new key */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" /> Create New API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Key Name</label>
                  <Input
                    type="text"
                    placeholder="e.g Production API"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rate Limit (requests/hour)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10000"
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>
              <Button onClick={handleCreateKey} disabled={createKeyMutation.isPending}>
                {createKeyMutation.isPending ? "Creating..." : "Create API Key"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2 h-5 w-5" /> Your API Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading API keys...</div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-center py-8">No API keys found</div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => {
                  const isNewKey = createKeyMutation.data?.data?.key_id === key.key_id;
                  const apiKeySecret = isNewKey ? createKeyMutation.data?.data?.api_key : undefined;

                  return (
                    <div key={key.id} className="border rounded-lg p-4 bg-card">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium">{key.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${key.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {key.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex space-x-4">
                              <span>Rate Limit: {key.rate_limit_per_hour}/hour</span>
                              <span>Usage Today: {key.usage_today}</span>
                              <span>Created: {format(new Date(key.created_at), "MMM d, yyyy")}</span>
                            </div>

                            <div className="flex items-center space-x-2 bg-secondary p-2 rounded">
                              <code className="flex-1 text-xs font-mono">
                                {getSecretDisplay(key.key_id, apiKeySecret)}
                              </code>
                              {apiKeySecret && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => toggleSecretVisibility(key.key_id)}>
                                    {showSecrets.has(key.key_id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(apiKeySecret, key.key_id)}>
                                    <Copy className={`h-4 w-4 ${copiedKey === key.key_id ? "text-green-600" : ""}`} />
                                  </Button>
                                </>
                              )}
                            </div>
                            {isNewKey && <p className="text-xs text-yellow-600">⚠️ Copy this key now, it won’t show again</p>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => deleteKeyMutation.mutate(key.key_id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" /> How to Use Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Authentication</h4>
                <p className="text-muted-foreground mb-2">Include your API key in headers:</p>
                <code className="block bg-secondary p-3 rounded text-xs">X-API-Key: your_api_key_here</code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Example Usage</h4>
                <code className="block bg-secondary p-3 rounded text-xs whitespace-pre-wrap">
{`curl -X POST https://your-domain.com/api/analyze \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'`}
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Rate Limits</h4>
                <p className="text-muted-foreground">
                  Each API key has its own rate limit. Exceeding the limit returns 429.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
