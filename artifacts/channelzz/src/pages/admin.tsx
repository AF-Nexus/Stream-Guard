import { useState } from "react";
import { useLocation } from "wouter";
import { 
  useGetMe, 
  useGetAdminStats,
  useListChannels, useCreateChannel, useUpdateChannel, useDeleteChannel,
  useListCategories, useCreateCategory, useDeleteCategory,
  useListAdminUsers, useUpdateUserAccess,
  useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement,
  useGetSettings, useUpdateSettings
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, Tv, LayoutDashboard, Settings as SettingsIcon, Bell, 
  Trash2, Edit, CheckCircle2, XCircle, ShieldAlert 
} from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: isLoadingMe } = useGetMe();

  if (isLoadingMe) {
    return <div className="container py-8"><Skeleton className="h-[600px] w-full rounded-xl" /></div>;
  }

  if (!me || me.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-card border border-border h-12 p-1 overflow-x-auto flex w-full justify-start md:w-auto">
          <TabsTrigger value="dashboard" className="gap-2 rounded-md"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="channels" className="gap-2 rounded-md"><Tv className="h-4 w-4" /> Channels</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 rounded-md"><LayoutDashboard className="h-4 w-4" /> Categories</TabsTrigger>
          <TabsTrigger value="users" className="gap-2 rounded-md"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2 rounded-md"><Bell className="h-4 w-4" /> Announcements</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 rounded-md"><SettingsIcon className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DashboardTab />
        </TabsContent>
        
        <TabsContent value="channels" className="space-y-4">
          <ChannelsTab />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersTab />
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementsTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Tabs Components ---

function DashboardTab() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading || !stats) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.paidUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalChannels}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.recentSignups.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || "—"}</TableCell>
                  <TableCell>{format(new Date(user.createdAt), "PPp")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const channelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  logoUrl: z.string().url("Must be a valid URL"),
  sourceUrl: z.string().url("Must be a valid M3U8 URL"),
  isLive: z.boolean().default(false),
});

function ChannelsTab() {
  const { data: channels } = useListChannels();
  const { data: categories } = useListCategories();
  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const deleteChannel = useDeleteChannel();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof channelSchema>>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      logoUrl: "",
      sourceUrl: "",
      isLive: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof channelSchema>) => {
    try {
      await createChannel.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({ title: "Channel created successfully" });
      form.reset();
      setIsCreateOpen(false);
    } catch (e) {
      toast({ title: "Failed to create channel", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Channels</CardTitle>
          <CardDescription>Manage live TV channels and streams.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Add Channel</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Channel</DialogTitle>
              <DialogDescription>Add a new HLS stream to the platform. Source URL is securely proxy-played.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Channel Name</FormLabel>
                      <FormControl><Input placeholder="SuperSport 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stream URL (M3U8)</FormLabel>
                      <FormControl><Input placeholder="https://.../stream.m3u8" {...field} /></FormControl>
                      <FormDescription>Never exposed to clients.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="24/7 sports coverage..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isLive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Is Live</FormLabel>
                        <FormDescription>Show the LIVE badge</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createChannel.isPending}>
                    {createChannel.isPending ? "Creating..." : "Create Channel"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels?.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>
                  <img src={channel.logoUrl} alt={channel.name} className="h-8 w-8 object-contain rounded" />
                </TableCell>
                <TableCell className="font-medium">{channel.name}</TableCell>
                <TableCell>{channel.categoryName}</TableCell>
                <TableCell>
                  {channel.isLive ? (
                    <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-bold">LIVE</span>
                  ) : (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-bold">VOD</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={async () => {
                      if (confirm("Delete this channel?")) {
                        await deleteChannel.mutateAsync({ id: channel.id });
                        queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
                        toast({ title: "Channel deleted" });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const categorySchema = z.object({ name: z.string().min(1) });

function CategoriesTab() {
  const { data: categories } = useListCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (values: z.infer<typeof categorySchema>) => {
    try {
      await createCategory.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      form.reset();
      toast({ title: "Category created" });
    } catch (e) {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl><Input placeholder="Sports" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createCategory.isPending}>Add Category</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <span className="font-medium">{cat.name}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={async () => {
                    if (confirm("Delete category?")) {
                      await deleteCategory.mutateAsync({ id: cat.id });
                      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
                      toast({ title: "Category deleted" });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const { data: users } = useListAdminUsers();
  const updateAccess = useUpdateUserAccess();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAction = async (id: string, action: any, message: string) => {
    try {
      await updateAccess.mutateAsync({ id, data: action });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: message });
    } catch (e) {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.email}</span>
                      <span className="text-xs text-muted-foreground">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-1 rounded">BANNED</span>
                    ) : (
                      <span className={`text-xs font-bold px-2 py-1 rounded ${user.access === 'paid' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                        {user.access.toUpperCase()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.access === 'paid' && user.subscriptionEndsAt ? format(new Date(user.subscriptionEndsAt), "PP") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleAction(user.id, { addDays: 30 }, "Added 30 days")}>
                        +30d
                      </Button>
                      <Button size="sm" variant={user.banned ? "default" : "destructive"} onClick={() => handleAction(user.id, { banned: !user.banned }, user.banned ? "User unbanned" : "User banned")}>
                        {user.banned ? "Unban" : "Ban"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

const annSchema = z.object({ title: z.string().min(1), body: z.string().min(1) });

function AnnouncementsTab() {
  const { data: announcements } = useListAnnouncements();
  const createAnn = useCreateAnnouncement();
  const deleteAnn = useDeleteAnnouncement();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof annSchema>>({
    resolver: zodResolver(annSchema),
    defaultValues: { title: "", body: "" },
  });

  const onSubmit = async (values: z.infer<typeof annSchema>) => {
    try {
      await createAnn.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      form.reset();
      toast({ title: "Announcement published" });
    } catch (e) {
      toast({ title: "Failed to publish", variant: "destructive" });
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>New Announcement</CardTitle>
          <CardDescription>Visible to all logged in users for 24h.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="Maintenance Update" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl><Textarea placeholder="System will be down at..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={createAnn.isPending}>Publish</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {announcements?.map((ann) => (
              <div key={ann.id} className="p-4 rounded-lg border bg-card relative">
                <Button 
                  variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6"
                  onClick={async () => {
                    await deleteAnn.mutateAsync({ id: ann.id });
                    queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <h4 className="font-bold pr-8">{ann.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{ann.body}</p>
              </div>
            ))}
            {announcements?.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No active announcements.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const settingsSchema = z.object({
  pricingText: z.string().min(1),
  whatsappNumber: z.string().min(1),
  trialHours: z.coerce.number().min(0),
});

function SettingsTab() {
  const { data: settings } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    values: {
      pricingText: settings?.pricingText || "",
      whatsappNumber: settings?.whatsappNumber || "",
      trialHours: settings?.trialHours || 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
    try {
      await updateSettings.mutateAsync({ data: values });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings updated" });
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  if (!settings) return null;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Platform Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="pricingText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Copy</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Pricing information shown to users..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>Visible on the paywall and landing page.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl><Input placeholder="+1234567890" {...field} /></FormControl>
                    <FormDescription>Must include country code.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trialHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trial Duration (Hours)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Hours granted on signup.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={updateSettings.isPending}>Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
