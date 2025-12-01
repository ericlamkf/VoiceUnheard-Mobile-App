import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  ImageBackground,
  Linking,
  Dimensions,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createClient, Session } from '@supabase/supabase-js';
import { Home, PlusCircle, Shield, Heart, MessageCircle, X, BookOpen, ExternalLink, Users, Scale, Mic, TrendingUp, Clock, HeartHandshake, Phone, MessageSquare, Globe, ChevronRight, Info, ShieldCheck, Trash2, ToggleLeft, ToggleRight, BadgeCheck, LogOut, UserCircle, MapPin, Loader2, Lock, ArrowRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

// Logo image
const logoImage = require('./assets/logo1.png');

// Screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// UUID Generator function
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ypuscwoavjvmeglzjxoy.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwdXNjd29hdmp2bWVnbHpqeG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMDE0MzgsImV4cCI6MjA3OTY3NzQzOH0.0b2h4JytsfxICOg_gEsoSdcHXFRAZbHsynIcWUjG8Mc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Types
type Tab = 'feed' | 'speak' | 'admin' | 'learn' | 'help' | 'profile';
type UserRole = 'user' | 'moderator' | null;

interface Post {
  id: string;
  title: string;
  category: string;
  content: string;
  is_approved: boolean;
  is_verified: boolean;
  likes_count: number;
  comments_count?: number;
  image_url?: string | null;
  location?: string;
  author_name?: string;
  author_avatar_url?: string;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  creator_device_id?: string | null;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url?: string | null;
  type: string;
  created_at: string;
}

const CATEGORIES = ['General', 'Mental Health', 'Education', 'Work', 'Family', 'Social', 'Other'];

const FILTER_CATEGORIES = ['Trending', 'Discrimination', 'Corruption', 'Workplace Abuse', 'Mental Health', 'Harassment', 'Other'];

export default function App() {
  // Authentication state
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Navigation state
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  // Feed state
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [stats, setStats] = useState({ totalVoices: 0, topCategory: 'None', todayCount: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Speak state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const locationSpinValue = useRef(new Animated.Value(0)).current;
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [deviceUserId, setDeviceUserId] = useState<string | null>(null);

  // Admin state
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminRefreshing, setAdminRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Learn state
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Help state
  const [helplines, setHelplines] = useState<any[]>([]);
  const [helplinesLoading, setHelplinesLoading] = useState(false);

  // Auth View state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  
  // Animated values for input borders
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;

  // Profile state
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [myComments, setMyComments] = useState<Comment[]>([]);
  const [profileStats, setProfileStats] = useState({ postsCount: 0, commentsCount: 0 });
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeProfileTab, setActiveProfileTab] = useState<'stories' | 'comments'>('stories');

  // Fetch user role from profiles table
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data && data.role) {
        setUserRole(data.role as UserRole);
      } else {
        setUserRole('user'); // Default to 'user' if no role is set
      }
    } catch (error: any) {
      console.error('Error fetching user role:', error);
      setUserRole('user'); // Default to 'user' on error
    }
  };

  // Authentication: Check session on mount and set up listener
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (mounted) {
          setSession(session);
          if (session) {
            await fetchUserRole(session.user.id);
          }
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
          // Reset to feed tab when logged out
          setActiveTab('feed');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch approved posts for Feed
  const fetchFeedPosts = useCallback(async () => {
    setFeedLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('is_approved', true);

      // Apply category filter and ordering
      if (selectedCategory === 'Trending') {
        // Trending: Order by likes_count descending (we'll sort by verified status in JS)
        query = query.order('likes_count', { ascending: false });
      } else {
        // Other categories: Filter by category and order by created_at descending
        // Map filter categories to possible database category values
        // This handles cases where posts might be stored with different category names
        const categoryVariations: Record<string, string[]> = {
          'Discrimination': ['Discrimination'],
          'Corruption': ['Corruption'],
          'Workplace Abuse': ['Workplace Abuse', 'Work', 'Workplace'], // Check all possible variations
          'Mental Health': ['Mental Health'],
          'Harassment': ['Harassment'],
          'Other': ['Other'],
        };
        
        // Get all possible category names that might match this filter
        const possibleCategories = categoryVariations[selectedCategory] || [selectedCategory];
        
        // Use .in() to match any of the possible category names
        query = query
          .in('category', possibleCategories)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch comment counts for all posts
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          // Get comment count for this post
          const { count, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          return {
            ...post,
            likes_count: post.likes_count ?? 0,
            comments_count: countError ? 0 : (count ?? 0),
            is_verified: post.is_verified ?? false,
          };
        })
      );
      
      // For Trending, prioritize verified posts, then sort by likes_count
      let sortedPosts = postsWithCounts;
      if (selectedCategory === 'Trending') {
        sortedPosts = [...postsWithCounts].sort((a, b) => {
          // First, sort by verified status (verified posts first)
          if (a.is_verified !== b.is_verified) {
            return a.is_verified ? -1 : 1; // verified (true) comes first
          }
          // Then, sort by likes_count (descending)
          return (b.likes_count ?? 0) - (a.likes_count ?? 0);
        });
      }
      
      setFeedPosts(sortedPosts);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load posts');
    } finally {
      setFeedLoading(false);
    }
  }, [selectedCategory]);

  // Fetch stats for Impact Dashboard
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Run three queries in parallel
      const [totalResult, categoriesResult, todayResult] = await Promise.all([
        // 1. Total Voices: Count all approved posts
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', true),
        
        // 2. Top Category: Get all categories and find the mode
        supabase
          .from('posts')
          .select('category')
          .eq('is_approved', true),
        
        // 3. Today's Voices: Count posts created today
        (async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayISO = today.toISOString();
          return supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('is_approved', true)
            .gte('created_at', todayISO);
        })(),
      ]);

      // Process results
      const totalVoices = totalResult.count ?? 0;
      
      // Find most frequent category
      const categories = categoriesResult.data || [];
      const categoryCounts: Record<string, number> = {};
      categories.forEach((post: any) => {
        const cat = post.category || 'Other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      
      let topCategory = 'None';
      let maxCount = 0;
      Object.entries(categoryCounts).forEach(([category, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topCategory = category;
        }
      });
      
      const todayCount = todayResult.count ?? 0;

      setStats({
        totalVoices,
        topCategory: topCategory || 'None',
        todayCount,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      // Don't show alert for stats errors, just log
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Pull-to-refresh for Feed
  const onFeedRefresh = useCallback(async () => {
    setFeedRefreshing(true);
    await Promise.all([fetchFeedPosts(), fetchStats()]);
    setFeedRefreshing(false);
  }, [fetchFeedPosts, fetchStats]);

  // Fetch unapproved posts for Admin
  // Fetch pending posts count
  const fetchPendingCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false);

      if (error) throw error;
      if (count !== null) setPendingCount(count);
    } catch (error: any) {
      console.error('Failed to fetch pending count:', error);
      // Don't show alert for this, just log the error
    }
  }, []);

  const fetchAdminPosts = useCallback(async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch comment counts for all posts
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          // Get comment count for this post
          const { count, error: countError } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          
          return {
            ...post,
            likes_count: post.likes_count ?? 0,
            comments_count: countError ? 0 : (count ?? 0),
          };
        })
      );
      
      setAdminPosts(postsWithCounts);
      // Also update pending count after fetching admin posts
      await fetchPendingCount();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load posts');
    } finally {
      setAdminLoading(false);
    }
  }, [fetchPendingCount]);

  // Pull-to-refresh for Admin
  const onAdminRefresh = useCallback(async () => {
    setAdminRefreshing(true);
    await fetchAdminPosts();
    setAdminRefreshing(false);
  }, [fetchAdminPosts]);

  // Fetch resources for Learn tab
  const fetchResources = useCallback(async () => {
    setResourcesLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load resources');
    } finally {
      setResourcesLoading(false);
    }
  }, []);

  // Fetch helplines for Help tab
  const fetchHelplines = useCallback(async () => {
    setHelplinesLoading(true);
    try {
      const { data, error } = await supabase
        .from('helplines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHelplines(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load helplines');
    } finally {
      setHelplinesLoading(false);
    }
  }, []);

  // Load liked posts from AsyncStorage
  const loadLikedPosts = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('likedPosts');
      if (stored) {
        const likedArray = JSON.parse(stored);
        setLikedPosts(new Set(likedArray));
      }
    } catch (error) {
      console.error('Failed to load liked posts:', error);
    }
  }, []);

  // Initialize device user ID
  const initializeDeviceUser = useCallback(async () => {
    try {
      const storedId = await AsyncStorage.getItem('device_user_id');
      if (storedId) {
        setDeviceUserId(storedId);
      } else {
        const newId = generateUUID();
        await AsyncStorage.setItem('device_user_id', newId);
        setDeviceUserId(newId);
      }
    } catch (error) {
      console.error('Failed to initialize device user ID:', error);
    }
  }, []);

  // Save liked posts to AsyncStorage
  const saveLikedPosts = useCallback(async (likedSet: Set<string>) => {
    try {
      const likedArray = Array.from(likedSet);
      await AsyncStorage.setItem('likedPosts', JSON.stringify(likedArray));
    } catch (error) {
      console.error('Failed to save liked posts:', error);
    }
  }, []);

  // Handle like post (toggle like/unlike, one per user)
  const handleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);
    const currentPost = feedPosts.find((p) => p.id === postId);
    const currentLikesCount = currentPost?.likes_count || 0;

    if (isCurrentlyLiked) {
      // Unlike: user already liked, remove like
      const newLikedPosts = new Set(likedPosts);
      newLikedPosts.delete(postId);
      setLikedPosts(newLikedPosts);
      saveLikedPosts(newLikedPosts);

      // Optimistic update: decrease count
      setFeedPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes_count: Math.max(0, currentLikesCount - 1) }
            : post
        )
      );

      // Update in Supabase
      try {
        const newLikesCount = Math.max(0, currentLikesCount - 1);
        const { error } = await supabase
          .from('posts')
          .update({ likes_count: newLikesCount })
          .eq('id', postId);

        if (error) throw error;
      } catch (error: any) {
        // Revert on error
        const revertedLikedPosts = new Set(likedPosts);
        revertedLikedPosts.add(postId);
        setLikedPosts(revertedLikedPosts);
        saveLikedPosts(revertedLikedPosts);
        setFeedPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: currentLikesCount }
              : post
          )
        );
        Alert.alert('Error', error.message || 'Failed to unlike post');
      }
    } else {
      // Like: user hasn't liked yet, add like
      const newLikedPosts = new Set(likedPosts);
      newLikedPosts.add(postId);
      setLikedPosts(newLikedPosts);
      saveLikedPosts(newLikedPosts);

      // Optimistic update: increase count
      setFeedPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, likes_count: currentLikesCount + 1 }
            : post
        )
      );

      // Update in Supabase
      try {
        const newLikesCount = currentLikesCount + 1;
        const { error } = await supabase
          .from('posts')
          .update({ likes_count: newLikesCount })
          .eq('id', postId);

        if (error) throw error;
      } catch (error: any) {
        // Revert on error
        const revertedLikedPosts = new Set(likedPosts);
        revertedLikedPosts.delete(postId);
        setLikedPosts(revertedLikedPosts);
        saveLikedPosts(revertedLikedPosts);
        setFeedPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? { ...post, likes_count: currentLikesCount }
              : post
          )
        );
        Alert.alert('Error', error.message || 'Failed to like post');
      }
    }
  };

  // Fetch comments for a post
  const fetchComments = useCallback(async (postId: string) => {
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load comments');
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  }, []);

  // Toggle comments section
  const toggleComments = useCallback(
    async (postId: string) => {
      const isExpanded = expandedComments.has(postId);
      if (isExpanded) {
        // Close
        const newExpanded = new Set(expandedComments);
        newExpanded.delete(postId);
        setExpandedComments(newExpanded);
      } else {
        // Open and always fetch comments to ensure we have the latest
        const newExpanded = new Set(expandedComments);
        newExpanded.add(postId);
        setExpandedComments(newExpanded);
        // Always fetch comments when expanding to get the latest data
        await fetchComments(postId);
      }
    },
    [expandedComments, fetchComments]
  );

  // Submit a comment
  const handleSubmitComment = async (postId: string) => {
    const commentText = commentTexts[postId]?.trim();
    if (!commentText) {
      Alert.alert('Validation', 'Please enter a comment');
      return;
    }

    if (!session?.user?.id && !deviceUserId) {
      Alert.alert('Error', 'Please sign in or restart the app.');
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const commentData: any = {
        post_id: postId,
        content: commentText,
      };

      // Include user_id if logged in
      if (session?.user?.id) {
        commentData.user_id = session.user.id;
      }

      // Include creator_device_id for backward compatibility
      if (deviceUserId) {
        commentData.creator_device_id = deviceUserId;
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }
      
      console.log('Comment created successfully with user_id:', commentData.user_id || 'none');

      // Add comment to local state
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data],
      }));

      // Update comment count in feed posts
      setFeedPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments_count: (post.comments_count ?? 0) + 1 }
            : post
        )
      );

      // Refresh profile data if on profile tab to update comment count
      if (activeTab === 'profile' && session?.user?.id) {
        // Trigger profile refresh by calling fetchUserProfileData
        setTimeout(() => {
          fetchUserProfileData();
        }, 500);
      }

      // Clear comment input
      setCommentTexts((prev) => {
        const newTexts = { ...prev };
        delete newTexts[postId];
        return newTexts;
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Delete a comment
  const deleteComment = async (commentId: string, postId: string) => {
    if (!deviceUserId) {
      Alert.alert('Error', 'Device ID not initialized');
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('creator_device_id', deviceUserId);

              if (error) throw error;

              // Remove comment from local state
              setComments((prev) => ({
                ...prev,
                [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
              }));

              // Update comment count in feed posts
              setFeedPosts((prev) =>
                prev.map((post) =>
                  post.id === postId
                    ? { ...post, comments_count: Math.max((post.comments_count ?? 0) - 1, 0) }
                    : post
                )
              );

              // Refresh comments to ensure consistency
              await fetchComments(postId);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  // Pick image from gallery
  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photo library to attach images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0] && result.assets[0].base64) {
        setSelectedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick image');
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  // Upload image to Supabase Storage
  const uploadImageToSupabase = async (base64Data: string): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Convert base64 to ArrayBuffer then to Uint8Array for React Native
      const base64Response = await fetch(`data:image/jpeg;base64,${base64Data}`);
      const blob = await base64Response.blob();
      
      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = fileName;

      // Convert blob to arrayBuffer then to Uint8Array for React Native compatibility
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to Supabase Storage using Uint8Array
      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  // Detect location using GPS
  const handleDetectLocation = async () => {
    setIsFetchingLocation(true);
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied.');
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const reverseGeocoded = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocoded && reverseGeocoded.length > 0) {
        const address = reverseGeocoded[0];
        // Format address: City, Region, Country (handle null values)
        const addressParts = [
          address.city,
          address.region,
          address.country,
        ].filter(Boolean); // Remove null/undefined values
        
        const formattedAddress = addressParts.join(', ');
        setLocation(formattedAddress);
      } else {
        Alert.alert('Error', 'Could not determine your location. Please try again.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to detect location');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Submit new post
  const handleSubmitPost = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Validation', 'Please fill in both title and content');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;

      // Upload image first if one is selected
      if (selectedImage && selectedImage.base64) {
        try {
          imageUrl = await uploadImageToSupabase(selectedImage.base64);
        } catch (uploadError: any) {
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload image. Try again.');
          setSubmitting(false);
          return;
        }
      }

      // Determine author details
      let name: string;
      let avatarUrl: string;
      
      if (session?.user) {
        // Use part of email as placeholder name
        name = session.user.email?.split('@')[0] || 'Community Member';
        // Generate unique avatar based on user ID
        avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${session.user.id}`;
      } else {
        // Anonymous user
        name = 'Anonymous';
        avatarUrl = 'https://api.dicebear.com/7.x/abstract/png?seed=anonymous';
      }

      // Insert post with image_url if available
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            category: category,
            location: location.trim() !== '' ? location.trim() : null,
            author_name: name,
            author_avatar_url: avatarUrl,
            is_verified: false,
            is_approved: false,
            image_url: imageUrl,
          },
        ]);

      if (error) throw error;

      // Refresh pending count for moderators
      if (userRole === 'moderator') {
        await fetchPendingCount();
      }

      Alert.alert('Success', 'Your voice has been submitted for review', [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setContent('');
            setLocation('');
            setCategory(CATEGORIES[0]);
            setSelectedImage(null);
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit post');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve post
  const handleApprove = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_approved: true })
        .eq('id', postId);

      if (error) throw error;

      Alert.alert('Success', 'Post approved');
      await fetchAdminPosts();
      await fetchFeedPosts(); // Refresh feed to show new approved post
      await fetchPendingCount(); // Update pending count
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve post');
    }
  };

  // Reject (delete) post
  const handleReject = async (postId: string) => {
    Alert.alert(
      'Confirm Rejection',
      'Are you sure you want to reject this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;

              Alert.alert('Success', 'Post rejected and deleted');
              await fetchAdminPosts();
              await fetchPendingCount(); // Update pending count
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject post');
            }
          },
        },
      ]
    );
  };

  // Toggle verification status
  const toggleVerification = async (postId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_verified: !currentStatus })
        .eq('id', postId);

      if (error) throw error;

      // Refresh admin posts to show updated status
      await fetchAdminPosts();
      // Also refresh feed posts if we're viewing approved posts
      if (activeTab === 'feed') {
        await fetchFeedPosts();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update verification status');
    }
  };

  // Check if onboarding has been shown
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        console.log('Onboarding check - hasLaunched value:', hasLaunched);
        // Show onboarding if value is null, undefined, empty string, or not exactly 'true'
        if (hasLaunched === null || hasLaunched === undefined || hasLaunched === '' || hasLaunched !== 'true') {
          console.log('Showing onboarding - first launch');
          setShowOnboarding(true);
        } else {
          console.log('Skipping onboarding - already launched');
          setShowOnboarding(false);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        // On error, show onboarding to be safe
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    try {
      // Save as string 'true' to ensure consistency
      await AsyncStorage.setItem('hasLaunched', 'true');
      // Verify it was saved
      const saved = await AsyncStorage.getItem('hasLaunched');
      if (saved === 'true') {
        setShowOnboarding(false);
      } else {
        console.error('Failed to save onboarding status');
        // Still proceed to main app
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowOnboarding(false); // Still proceed even if save fails
    }
  };

  // Initialize device user ID on app load
  useEffect(() => {
    initializeDeviceUser();
  }, [initializeDeviceUser]);

  // Load liked posts on mount
  useEffect(() => {
    if (!showOnboarding) {
      loadLikedPosts();
    }
  }, [loadLikedPosts, showOnboarding]);

  // Load data when switching tabs
  useEffect(() => {
    if (activeTab === 'feed') {
      fetchFeedPosts();
      fetchStats();
    } else if (activeTab === 'admin') {
      fetchAdminPosts();
      fetchPendingCount();
    } else if (activeTab === 'learn') {
      fetchResources();
    } else if (activeTab === 'help') {
      fetchHelplines();
    }
  }, [activeTab, fetchFeedPosts, fetchAdminPosts, fetchResources, fetchStats, fetchHelplines, fetchPendingCount]);

  // Fetch pending count when user becomes a moderator
  useEffect(() => {
    if (userRole === 'moderator' && session) {
      fetchPendingCount();
    }
  }, [userRole, session, fetchPendingCount]);

  // Render Feed Tab
  const renderFeedTab = () => {
    if (feedLoading && feedPosts.length === 0) {
      return (
        <View style={styles.feedContainer}>
          <View style={styles.feedHeaderContainer}>
            <View style={styles.feedHeaderLeft}>
              <Text style={styles.tabTitle}>Feeds</Text>
            </View>
          </View>
          
          {/* Impact Dashboard - Loading State */}
          <View style={styles.impactDashboard}>
            <Text style={styles.impactDashboardTitle}>Our Collective Impact</Text>
            <View style={styles.impactStatsRow}>
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <Mic size={24} color="#8b5cf6" />
                </View>
                <ActivityIndicator size="small" color="#8b5cf6" style={{ marginVertical: 8 }} />
                <Text style={styles.impactStatLabel}>Total Voices Heard</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <TrendingUp size={24} color="#ec4899" />
                </View>
                <ActivityIndicator size="small" color="#ec4899" style={{ marginVertical: 8 }} />
                <Text style={styles.impactStatLabel}>Top Issue Today</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <Clock size={24} color="#60a5fa" />
                </View>
                <ActivityIndicator size="small" color="#60a5fa" style={{ marginVertical: 8 }} />
                <Text style={styles.impactStatLabel}>Voices Today</Text>
              </View>
            </View>
          </View>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilterContainer}
            contentContainerStyle={styles.categoryFilterContent}
          >
            {FILTER_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading voices...</Text>
          </View>
        </View>
      );
    }

    if (feedPosts.length === 0) {
      return (
        <View style={styles.feedContainer}>
          <View style={styles.feedHeaderContainer}>
            <View style={styles.feedHeaderLeft}>
              <Text style={styles.tabTitle}>Feeds</Text>
            </View>
          </View>
          
          {/* Impact Dashboard */}
          <View style={styles.impactDashboard}>
            <Text style={styles.impactDashboardTitle}>Our Collective Impact</Text>
            <View style={styles.impactStatsRow}>
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <Mic size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.impactStatValue}>
                  {statsLoading ? '...' : stats.totalVoices}
                </Text>
                <Text style={styles.impactStatLabel}>Total Voices Heard</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <TrendingUp size={24} color="#ec4899" />
                </View>
                <Text style={styles.impactStatValue} numberOfLines={1}>
                  {statsLoading ? '...' : (stats.topCategory.length > 12 ? stats.topCategory.substring(0, 12) + '...' : stats.topCategory)}
                </Text>
                <Text style={styles.impactStatLabel}>Top Issue Today</Text>
              </View>
              <View style={styles.impactStatDivider} />
              <View style={styles.impactStatBlock}>
                <View style={styles.impactStatIconContainer}>
                  <Clock size={24} color="#60a5fa" />
                </View>
                <Text style={styles.impactStatValue}>
                  {statsLoading ? '...' : stats.todayCount}
                </Text>
                <Text style={styles.impactStatLabel}>Voices Today</Text>
              </View>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryFilterContainer}
            contentContainerStyle={styles.categoryFilterContent}
          >
            {FILTER_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No voices yet. Be the first to share!</Text>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={feedPosts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={styles.feedHeaderContainer}>
              <View style={styles.feedHeaderLeft}>
                <Text style={styles.tabTitle}>Feeds</Text>
              </View>
              <TouchableOpacity
                style={styles.signOutButton}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <LogOut size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            {/* Impact Dashboard */}
            <View style={styles.impactDashboard}>
              <Text style={styles.impactDashboardTitle}>Our Collective Impact</Text>
              <View style={styles.impactStatsRow}>
                {/* Total Voices Block */}
                <View style={styles.impactStatBlock}>
                  <View style={styles.impactStatIconContainer}>
                    <Mic size={24} color="#8b5cf6" />
                  </View>
                  <Text style={styles.impactStatValue}>
                    {statsLoading ? '...' : stats.totalVoices}
                  </Text>
                  <Text style={styles.impactStatLabel}>Total Voices Heard</Text>
                </View>
                
                {/* Divider */}
                <View style={styles.impactStatDivider} />
                
                {/* Top Issue Block */}
                <View style={styles.impactStatBlock}>
                  <View style={styles.impactStatIconContainer}>
                    <TrendingUp size={24} color="#ec4899" />
                  </View>
                  <Text style={styles.impactStatValue} numberOfLines={1}>
                    {statsLoading ? '...' : (stats.topCategory.length > 12 ? stats.topCategory.substring(0, 12) + '...' : stats.topCategory)}
                  </Text>
                  <Text style={styles.impactStatLabel}>Top Issue Today</Text>
                </View>
                
                {/* Divider */}
                <View style={styles.impactStatDivider} />
                
                {/* Today's Voices Block */}
                <View style={styles.impactStatBlock}>
                  <View style={styles.impactStatIconContainer}>
                    <Clock size={24} color="#60a5fa" />
                  </View>
                  <Text style={styles.impactStatValue}>
                    {statsLoading ? '...' : stats.todayCount}
                  </Text>
                  <Text style={styles.impactStatLabel}>Voices Today</Text>
                </View>
              </View>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilterContainer}
              contentContainerStyle={styles.categoryFilterContent}
            >
              {FILTER_CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => {
          const isCommentsExpanded = expandedComments.has(item.id);
          const postComments = comments[item.id] || [];
          const commentText = commentTexts[item.id] || '';

          return (
            <View style={styles.postCard}>
              {/* Author Info */}
              <View style={styles.postAuthorSection}>
                <View style={styles.postAuthorLeft}>
                  <Image
                    source={{ uri: item.author_avatar_url || 'https://api.dicebear.com/7.x/abstract/png?seed=anonymous' }}
                    style={styles.postAuthorAvatar}
                  />
                  <View style={styles.postAuthorInfo}>
                    <View style={styles.postAuthorNameRow}>
                      <Text style={styles.postAuthorName}>{item.author_name || 'Anonymous'}</Text>
                      {(item.is_verified ?? false) && (
                        <View style={styles.verifiedBadge}>
                          <BadgeCheck size={14} color="#3b82f6" />
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.postAuthorRight}>
                  <Text style={styles.postCategory}>{item.category}</Text>
                  {item.location && (
                    <Text style={styles.postLocation}>{item.location}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.postTitle}>{item.title}</Text>
              <Text style={styles.postContent}>{item.content}</Text>

              {/* Post Image */}
              {item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {/* Like and Comment Actions */}
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButtonRow}
                  onPress={() => handleLike(item.id)}
                >
                  <Heart
                    size={20}
                    color={likedPosts.has(item.id) ? "#ef4444" : "#64748b"}
                    fill={likedPosts.has(item.id) ? "#ef4444" : "none"}
                  />
                  <Text style={styles.actionCount}>{item.likes_count || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButtonRow}
                  onPress={() => toggleComments(item.id)}
                >
                  <MessageCircle
                    size={20}
                    color={isCommentsExpanded ? '#60a5fa' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.actionCount,
                      isCommentsExpanded && styles.actionCountActive,
                    ]}
                  >
                    {item.comments_count ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Comments Section */}
              {isCommentsExpanded && (
                <View style={styles.commentsSection}>
                  <Text style={styles.commentsSectionTitle}>Comments</Text>

                  {/* Comments List */}
                  {loadingComments[item.id] ? (
                    <ActivityIndicator
                      size="small"
                      color="#60a5fa"
                      style={styles.commentLoader}
                    />
                  ) : postComments.length > 0 ? (
                    <View style={styles.commentsList}>
                      {postComments.map((comment) => {
                        const canDelete = deviceUserId && comment.creator_device_id === deviceUserId;
                        return (
                          <View key={comment.id} style={styles.commentItem}>
                            <View style={styles.commentItemContent}>
                              <View style={styles.commentTextContainer}>
                                <Text style={styles.commentContent}>{comment.content}</Text>
                                <Text style={styles.commentDate}>
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </Text>
                              </View>
                              {canDelete && (
                                <TouchableOpacity
                                  style={styles.commentDeleteButton}
                                  onPress={() => deleteComment(comment.id, item.id)}
                                  activeOpacity={0.7}
                                >
                                  <Trash2 size={16} color="#ef4444" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noCommentsText}>No comments yet</Text>
                  )}

                  {/* Comment Input */}
                  <View style={styles.commentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Write a comment..."
                      placeholderTextColor="#64748b"
                      value={commentText}
                      onChangeText={(text) =>
                        setCommentTexts((prev) => ({ ...prev, [item.id]: text }))
                      }
                      multiline
                      maxLength={500}
                    />
                    <TouchableOpacity
                      style={[
                        styles.commentSendButton,
                        submittingComment[item.id] && styles.commentSendButtonDisabled,
                      ]}
                      onPress={() => handleSubmitComment(item.id)}
                      disabled={submittingComment[item.id] || !commentText.trim()}
                    >
                      {submittingComment[item.id] ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.commentSendButtonText}>Send</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={feedRefreshing}
            onRefresh={onFeedRefresh}
            tintColor="#60a5fa"
          />
        }
      />
    );
  };

  // Animate location spinner
  useEffect(() => {
    if (isFetchingLocation) {
      Animated.loop(
        Animated.timing(locationSpinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      locationSpinValue.setValue(0);
    }
  }, [isFetchingLocation, locationSpinValue]);

  // Animate email input border on focus
  useEffect(() => {
    Animated.timing(emailBorderAnim, {
      toValue: emailFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [emailFocused, emailBorderAnim]);

  // Animate password input border on focus
  useEffect(() => {
    Animated.timing(passwordBorderAnim, {
      toValue: passwordFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [passwordFocused, passwordBorderAnim]);

  const locationSpin = locationSpinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Render Speak Tab
  const renderSpeakTab = () => {
    return (
      <>
        <ScrollView style={styles.speakContainer} contentContainerStyle={styles.speakContent}>
          <View style={styles.speakHeader}>
            <Text style={styles.sectionTitle}>Share Your Voice</Text>
            <TouchableOpacity
              onPress={() => setShowSafetyModal(true)}
              style={styles.safetyInfoButton}
              activeOpacity={0.7}
            >
              <Info size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            Your story matters. Share what's on your mind.
          </Text>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Give your voice a title"
          placeholderTextColor="#64748b"
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Location (Optional e.g., 'City, Country')</Text>
        <View style={styles.locationInputContainer}>
          <View style={styles.locationInputLeft}>
            <MapPin size={20} color="#64748b" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              placeholder="Enter location (optional)"
              placeholderTextColor="#64748b"
              value={location}
              onChangeText={setLocation}
              maxLength={100}
              editable={!isFetchingLocation}
            />
          </View>
          <TouchableOpacity
            style={styles.locationDetectButton}
            onPress={handleDetectLocation}
            disabled={isFetchingLocation}
            activeOpacity={0.7}
          >
            {isFetchingLocation ? (
              <Animated.View style={{ transform: [{ rotate: locationSpin }] }}>
                <Loader2 size={18} color="#8b5cf6" />
              </Animated.View>
            ) : (
              <Text style={styles.locationDetectButtonText}>Detect Location</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text style={styles.categoryButtonText}>{category}</Text>
          <Text style={styles.categoryButtonArrow}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Your Story</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Share your thoughts, experiences, or feelings..."
          placeholderTextColor="#64748b"
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          maxLength={2000}
        />

        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickImage}
          disabled={submitting}
        >
          <Text style={styles.attachButtonText}>Attach Evidence (Photo)</Text>
        </TouchableOpacity>

        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={handleRemoveImage}
              disabled={submitting}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitPost}
          disabled={submitting || uploadingImage}
        >
          {(submitting || uploadingImage) ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {uploadingImage ? 'Uploading Image...' : 'Submit Your Voice'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimerText}>
          Your submission will be reviewed before being published.
        </Text>
      </ScrollView>

      {/* Anonymity Guarantee Modal */}
      <Modal
        visible={showSafetyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSafetyModal(false)}
      >
        <View style={styles.safetyModalOverlay}>
          <View style={styles.safetyModalContainer}>
            {/* Header */}
            <View style={styles.safetyModalHeader}>
              <View style={styles.safetyModalIconContainer}>
                <ShieldCheck size={48} color="#8b5cf6" />
              </View>
              <Text style={styles.safetyModalTitle}>How We Protect You</Text>
            </View>

            {/* Body */}
            <View style={styles.safetyModalBody}>
              <View style={styles.safetyBulletPoint}>
                <Text style={styles.safetyBullet}>•</Text>
                <Text style={styles.safetyText}>
                  No Accounts Required: We never ask for your name, email, or phone number.
                </Text>
              </View>
              <View style={styles.safetyBulletPoint}>
                <Text style={styles.safetyBullet}>•</Text>
                <Text style={styles.safetyText}>
                  No IP Tracking: Your location data is not logged with your submission.
                </Text>
              </View>
              <View style={styles.safetyBulletPoint}>
                <Text style={styles.safetyBullet}>•</Text>
                <Text style={styles.safetyText}>
                  Encrypted Storage: Your story is stored securely in our encrypted database.
                </Text>
              </View>
              <View style={styles.safetyBulletPoint}>
                <Text style={styles.safetyBullet}>•</Text>
                <Text style={styles.safetyText}>
                  Human Moderation: All reports are reviewed to remove identifying details before publishing.
                </Text>
              </View>
            </View>

            {/* Footer */}
            <TouchableOpacity
              style={styles.safetyModalButton}
              onPress={() => setShowSafetyModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.safetyModalButtonText}>I Understand & Trust</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </>
    );
  };

  // Render Admin Tab
  const renderAdminTab = () => {
    if (adminLoading && adminPosts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={styles.loadingText}>Loading pending posts...</Text>
        </View>
      );
    }

    if (adminPosts.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No pending posts to review.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={adminPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postCategory}>{item.category}</Text>
              <Text style={styles.postDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent}>{item.content}</Text>

            {/* Post Image */}
            {item.image_url && (
              <Image
                source={{ uri: item.image_url }}
                style={styles.postImage}
                resizeMode="cover"
              />
            )}

            {/* Verification Toggle */}
            <View style={styles.verificationControl}>
              <Text style={styles.verificationLabel}>Credibility Check:</Text>
              <TouchableOpacity
                style={styles.verificationToggle}
                onPress={() => toggleVerification(item.id, item.is_verified ?? false)}
                activeOpacity={0.7}
              >
                {(item.is_verified ?? false) ? (
                  <ToggleRight size={32} color="#3b82f6" />
                ) : (
                  <ToggleLeft size={32} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.adminActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApprove(item.id)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item.id)}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={adminRefreshing}
            onRefresh={onAdminRefresh}
            tintColor="#60a5fa"
          />
        }
      />
    );
  };

  // Get badge color based on resource type
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'organization':
        return '#8b5cf6'; // Purple
      case 'article':
        return '#3b82f6'; // Blue
      case 'infographic':
        return '#10b981'; // Green
      default:
        return '#64748b'; // Gray
    }
  };

  // Handle resource card press
  const handleResourcePress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open URL');
    }
  };

  // SDG Header Card Component
  const SDGHeaderCard = () => {
    const handlePress = () => {
      Linking.openURL('https://sdgs.un.org/goals/goal16').catch((err) =>
        console.error('Failed to open URL:', err)
      );
    };

    return (
      <TouchableOpacity
        style={styles.sdgCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          }}
          style={styles.sdgCardBackground}
          resizeMode="cover"
        >
          {/* Overlay */}
          <View style={styles.sdgCardOverlay} />
          
          {/* Content */}
          <View style={styles.sdgCardContent}>
            {/* SDG Badge */}
            <View style={styles.sdgBadge}>
              <Text style={styles.sdgBadgeText}>16</Text>
            </View>

            {/* Title */}
            <Text style={styles.sdgCardTitle}>
              PEACE, JUSTICE AND STRONG INSTITUTIONS
            </Text>

            {/* Description */}
            <Text style={styles.sdgCardDescription}>
              Promote peaceful and inclusive societies, provide access to justice for all, and build effective, accountable and inclusive institutions at all levels.
            </Text>

            {/* CTA */}
            <View style={styles.sdgCardCTA}>
              <Text style={styles.sdgCardCTAText}>Learn More at un.org</Text>
              <ExternalLink size={16} color="#ffffff" />
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  // Render Learn Tab
  const renderLearnTab = () => {
    if (resourcesLoading && resources.length === 0) {
      return (
        <ScrollView style={styles.feedContainer} contentContainerStyle={styles.learnContentContainer}>
          <SDGHeaderCard />
          <Text style={styles.tabTitle}>Learn</Text>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading resources...</Text>
          </View>
        </ScrollView>
      );
    }

    if (resources.length === 0) {
      return (
        <ScrollView style={styles.feedContainer} contentContainerStyle={styles.learnContentContainer}>
          <SDGHeaderCard />
          <Text style={styles.tabTitle}>Learn</Text>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No resources available yet.</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.feedContainer} contentContainerStyle={styles.learnContentContainer}>
        <SDGHeaderCard />
        <Text style={styles.tabTitle}>Learn</Text>
        {resources.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.resourceCard}
            onPress={() => handleResourcePress(item.url)}
            activeOpacity={0.8}
          >
            <View style={styles.resourceImageContainer}>
              {item.image_url ? (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.resourceImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.resourceImage, styles.resourceImagePlaceholder]}>
                  <BookOpen size={48} color="#64748b" />
                </View>
              )}
              <View
                style={[
                  styles.resourceBadge,
                  { backgroundColor: getBadgeColor(item.type) },
                ]}
              >
                <Text style={styles.resourceBadgeText}>{item.type}</Text>
              </View>
            </View>
            <View style={styles.resourceContent}>
              <View style={styles.resourceHeader}>
                <Text style={styles.resourceTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <ExternalLink size={20} color="#60a5fa" />
              </View>
              <Text style={styles.resourceDescription} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Render Help Tab
  const renderHelpTab = () => {
    // Helper function to get theme colors
    const getThemeColors = (theme: string) => {
      switch (theme?.toLowerCase()) {
        case 'red':
          return {
            background: 'rgba(127, 29, 29, 0.5)', // bg-red-900/50
            border: '#ef4444', // border-red-500
          };
        case 'purple':
          return {
            background: 'rgba(88, 28, 135, 0.5)', // bg-purple-900/50
            border: '#a855f7', // border-purple-500
          };
        case 'blue':
          return {
            background: 'rgba(30, 58, 138, 0.5)', // bg-blue-900/50
            border: '#3b82f6', // border-blue-500
          };
        case 'pink':
          return {
            background: 'rgba(131, 24, 67, 0.5)', // bg-pink-900/50
            border: '#ec4899', // border-pink-500
          };
        case 'slate':
        default:
          return {
            background: 'rgba(15, 23, 42, 0.5)', // bg-slate-900/50
            border: '#64748b', // border-slate-500
          };
      }
    };

    // Helper function to get icon based on action_type
    const getActionIcon = (actionType: string) => {
      switch (actionType?.toLowerCase()) {
        case 'call':
          return Phone;
        case 'text':
          return MessageSquare;
        case 'web':
          return Globe;
        default:
          return Phone;
      }
    };

    // Handle helpline press
    const handleHelplinePress = async (item: any) => {
      try {
        let url = '';
        const actionType = item.action_type?.toLowerCase();
        const contactData = item.contact_data;

        if (!contactData) {
          Alert.alert('Error', 'Contact information not available');
          return;
        }

        if (actionType === 'call') {
          url = `tel:${contactData}`;
        } else if (actionType === 'text') {
          url = `sms:${contactData}`;
        } else if (actionType === 'web') {
          url = contactData;
        } else {
          Alert.alert('Error', 'Unknown action type');
          return;
        }

        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open this link');
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to open link');
      }
    };

    if (helplinesLoading && helplines.length === 0) {
      return (
        <View style={styles.feedContainer}>
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>Immediate Support</Text>
            <Text style={styles.helpSubtitle}>
              You are not alone. Connect with help instantly.
            </Text>
          </View>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text style={styles.loadingText}>Loading support resources...</Text>
          </View>
        </View>
      );
    }

    if (helplines.length === 0) {
      return (
        <View style={styles.feedContainer}>
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>Immediate Support</Text>
            <Text style={styles.helpSubtitle}>
              You are not alone. Connect with help instantly.
            </Text>
          </View>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No support resources available yet.</Text>
          </View>
        </View>
      );
    }

    return (
      <FlatList
        data={helplines}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>Immediate Support</Text>
            <Text style={styles.helpSubtitle}>
              You are not alone. Connect with help instantly.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const themeColors = getThemeColors(item.color_theme);
          const IconComponent = getActionIcon(item.action_type);

          return (
            <TouchableOpacity
              style={[
                styles.helplineCard,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                },
              ]}
              onPress={() => handleHelplinePress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.helplineContent}>
                {/* Left: Icon */}
                <View style={styles.helplineIconContainer}>
                  <IconComponent size={28} color={themeColors.border} />
                </View>

                {/* Middle: Name and Description */}
                <View style={styles.helplineTextContainer}>
                  <Text style={styles.helplineName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text style={styles.helplineDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </View>

                {/* Right: Arrow */}
                <ChevronRight size={24} color={themeColors.border} />
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.listContent, { paddingTop: 20, paddingBottom: 20 }]}
      />
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Reset auth-related state
      setEmail('');
      setPassword('');
      setIsLoginMode(true);
      setActiveTab('feed');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign out');
    }
  };

  // Fetch user profile data
  const fetchUserProfileData = useCallback(async () => {
    if (!session?.user?.id) {
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const userId = session.user.id;

      // Try to fetch data - handle errors gracefully if columns don't exist
      let postsCount = 0;
      let commentsCount = 0;
      let postsData: Post[] = [];
      let commentsData: Comment[] = [];

      try {
        // Try to count posts by user_id
        const postsCountResult = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (postsCountResult.error) {
          // If column doesn't exist or other error, just use 0
          console.log('Posts count query result:', postsCountResult.error.message);
        } else {
          postsCount = postsCountResult.count || 0;
        }
      } catch (err) {
        console.log('Posts count error:', err);
      }

      try {
        // Try to count comments by user_id
        const commentsCountResult = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        
        if (commentsCountResult.error) {
          console.log('Comments count query result:', commentsCountResult.error.message);
        } else {
          commentsCount = commentsCountResult.count || 0;
        }
      } catch (err) {
        console.log('Comments count error:', err);
      }

      try {
        // Try to fetch posts by user_id
        const postsDataResult = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (postsDataResult.error) {
          console.log('Posts data query result:', postsDataResult.error.message);
        } else {
          postsData = (postsDataResult.data || []) as Post[];
        }
      } catch (err) {
        console.log('Posts data error:', err);
      }

      try {
        // Try to fetch comments by user_id
        const commentsDataResult = await supabase
          .from('comments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (commentsDataResult.error) {
          console.log('Comments data query result:', commentsDataResult.error.message);
        } else {
          commentsData = (commentsDataResult.data || []) as Comment[];
        }
      } catch (err) {
        console.log('Comments data error:', err);
      }

      // Set stats and data
      setProfileStats({
        postsCount,
        commentsCount,
      });

      setMyPosts(postsData);
      setMyComments(commentsData);
    } catch (error: any) {
      console.error('Profile data fetch error:', error);
      // Silently fail and show empty state - columns might not exist yet
      setProfileStats({
        postsCount: 0,
        commentsCount: 0,
      });
      setMyPosts([]);
      setMyComments([]);
    } finally {
      setProfileLoading(false);
    }
  }, [session]);

  // Load profile data when profile tab is selected
  useEffect(() => {
    if (activeTab === 'profile' && session) {
      fetchUserProfileData();
    }
  }, [activeTab, session, fetchUserProfileData]);

  // Render Profile Tab
  const renderProfileTab = () => {
    if (!session) {
      return (
        <View style={styles.feedContainer}>
          <View style={styles.centerContainer}>
            <Text style={styles.accessDeniedText}>Please sign in to view your profile.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.feedContainer}>
        <ScrollView
          style={styles.profileScrollView}
          contentContainerStyle={styles.profileContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatarContainer}>
              <UserCircle size={80} color="#94a3b8" />
            </View>
            <Text style={styles.profileEmail}>{session.user.email}</Text>
            
            {/* Role Badge */}
            <View
              style={[
                styles.profileRoleBadge,
                userRole === 'moderator'
                  ? styles.profileRoleBadgeModerator
                  : styles.profileRoleBadgeUser,
              ]}
            >
              {userRole === 'moderator' && (
                <Shield size={16} color="#f1f5f9" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.profileRoleText}>
                {userRole === 'moderator' ? 'Moderator' : 'Community Member'}
              </Text>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.profileStatsContainer}>
            <View style={styles.profileStatCard}>
              {profileLoading ? (
                <ActivityIndicator size="small" color="#60a5fa" />
              ) : (
                <>
                  <Text style={styles.profileStatValue}>{profileStats.postsCount}</Text>
                  <Text style={styles.profileStatLabel}>My Stories</Text>
                </>
              )}
            </View>
            
            <View style={styles.profileStatCard}>
              {profileLoading ? (
                <ActivityIndicator size="small" color="#60a5fa" />
              ) : (
                <>
                  <Text style={styles.profileStatValue}>{profileStats.commentsCount}</Text>
                  <Text style={styles.profileStatLabel}>My Comments</Text>
                </>
              )}
            </View>
          </View>

          {/* Activity History Section */}
          <View style={styles.profileActivityContainer}>
            {/* Tab Selector */}
            <View style={styles.profileTabSelector}>
              <TouchableOpacity
                style={[
                  styles.profileTabButton,
                  activeProfileTab === 'stories' && styles.profileTabButtonActive,
                ]}
                onPress={() => setActiveProfileTab('stories')}
              >
                <Text
                  style={[
                    styles.profileTabButtonText,
                    activeProfileTab === 'stories' && styles.profileTabButtonTextActive,
                  ]}
                >
                  Stories
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.profileTabButton,
                  activeProfileTab === 'comments' && styles.profileTabButtonActive,
                ]}
                onPress={() => setActiveProfileTab('comments')}
              >
                <Text
                  style={[
                    styles.profileTabButtonText,
                    activeProfileTab === 'comments' && styles.profileTabButtonTextActive,
                  ]}
                >
                  Comments
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            {profileLoading ? (
              <View style={[styles.centerContainer, { paddingVertical: 40 }]}>
                <ActivityIndicator size="large" color="#60a5fa" />
              </View>
            ) : activeProfileTab === 'stories' ? (
              myPosts.length === 0 ? (
                <View style={[styles.centerContainer, { paddingVertical: 40 }]}>
                  <Text style={styles.emptyText}>No stories yet. Share your voice!</Text>
                </View>
              ) : (
                <FlatList
                  data={myPosts}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.profileActivityItem}>
                      <Text style={styles.profileActivityItemTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View style={styles.profileActivityItemMeta}>
                        <Text style={styles.profileActivityItemDate}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                        <View
                          style={[
                            styles.profileActivityItemStatus,
                            item.is_approved
                              ? styles.profileActivityItemStatusApproved
                              : styles.profileActivityItemStatusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.profileActivityItemStatusText,
                              item.is_approved
                                ? styles.profileActivityItemStatusTextApproved
                                : styles.profileActivityItemStatusTextPending,
                            ]}
                          >
                            {item.is_approved ? 'Approved' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                />
              )
            ) : (
              myComments.length === 0 ? (
                <View style={[styles.centerContainer, { paddingVertical: 40 }]}>
                  <Text style={styles.emptyText}>No comments yet. Start engaging!</Text>
                </View>
              ) : (
                <FlatList
                  data={myComments}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.profileActivityItem}>
                      <Text style={styles.profileActivityItemContent} numberOfLines={3}>
                        {item.content}
                      </Text>
                      <Text style={styles.profileActivityItemDate}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                />
              )
            )}
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={styles.profileSignOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <LogOut size={20} color="#f1f5f9" style={{ marginRight: 8 }} />
            <Text style={styles.profileSignOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return renderFeedTab();
      case 'speak':
        return renderSpeakTab();
      case 'admin':
        // Check if user is moderator
        if (userRole !== 'moderator') {
          return (
            <View style={styles.feedContainer}>
              <View style={styles.centerContainer}>
                <Shield size={64} color="#64748b" />
                <Text style={styles.accessDeniedTitle}>Access Denied</Text>
                <Text style={styles.accessDeniedText}>
                  You need moderator privileges to access this section.
                </Text>
                <TouchableOpacity
                  style={styles.accessDeniedButton}
                  onPress={() => setActiveTab('feed')}
                >
                  <Text style={styles.accessDeniedButtonText}>Go to Feed</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }
        return renderAdminTab();
      case 'learn':
        return renderLearnTab();
      case 'help':
        return renderHelpTab();
      case 'profile':
        return renderProfileTab();
      default:
        return null;
    }
  };

  // Auth View Component
  const renderAuthView = () => {
    const handleAuth = async () => {
      if (!email.trim() || !password.trim()) {
        Alert.alert('Error', 'Please enter both email and password');
        return;
      }

      setAuthLoading(true);
      try {
        if (isLoginMode) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (error) throw error;
        } else {
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
          });

          if (error) throw error;

          Alert.alert(
            'Success',
            'Account created! Please check your email to verify your account.',
            [{ text: 'OK', onPress: () => setIsLoginMode(true) }]
          );
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Authentication failed');
      } finally {
        setAuthLoading(false);
      }
    };

    // Animated border colors
    const emailBorderColor = emailBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#334155', '#8b5cf6'],
    });
    const emailBorderWidth = emailBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });
    const emailShadowOpacity = emailBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    });

    const passwordBorderColor = passwordBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['#334155', '#8b5cf6'],
    });
    const passwordBorderWidth = passwordBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    });
    const passwordShadowOpacity = passwordBorderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
    });

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.authContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header */}
          <View style={styles.authHeader}>
            <Image source={logoImage} style={styles.authLogo} resizeMode="contain" />
            <Text style={styles.authTitle}>
              {isLoginMode ? 'Welcome Back' : 'Join VoiceUnheard'}
            </Text>
            <Text style={styles.authSubtitle}>
              {isLoginMode
                ? 'Sign in to continue sharing your voice'
                : 'Create an account to get started'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.authForm}>
            <View style={styles.authInputContainer}>
              <Text style={styles.authInputLabel}>EMAIL</Text>
              <Animated.View
                style={[
                  styles.authInputWrapper,
                  {
                    borderColor: emailBorderColor,
                    borderWidth: emailBorderWidth,
                    shadowColor: '#8b5cf6',
                    shadowOpacity: emailShadowOpacity,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: emailFocused ? 8 : 0,
                  },
                ]}
              >
                <UserCircle size={20} color="#64748b" style={styles.authInputIcon} />
                <TextInput
                  style={styles.authInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!authLoading}
                />
              </Animated.View>
            </View>

            <View style={styles.authInputContainer}>
              <Text style={styles.authInputLabel}>PASSWORD</Text>
              <Animated.View
                style={[
                  styles.authInputWrapper,
                  {
                    borderColor: passwordBorderColor,
                    borderWidth: passwordBorderWidth,
                    shadowColor: '#8b5cf6',
                    shadowOpacity: passwordShadowOpacity,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: passwordFocused ? 8 : 0,
                  },
                ]}
              >
                <Lock size={20} color="#64748b" style={styles.authInputIcon} />
                <TextInput
                  style={styles.authInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!authLoading}
                />
              </Animated.View>
            </View>

            <TouchableOpacity
              style={[styles.authButton, authLoading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={authLoading}
              activeOpacity={0.8}
            >
              {authLoading ? (
                <ActivityIndicator size="small" color="#f1f5f9" />
              ) : (
                <>
                  <Text style={styles.authButtonText}>
                    {isLoginMode ? 'Sign In' : 'Sign Up'}
                  </Text>
                  <ArrowRight size={20} color="#f1f5f9" style={styles.authButtonArrow} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.authToggleButton}
              onPress={() => setIsLoginMode(!isLoginMode)}
              disabled={authLoading}
            >
              <Text style={styles.authToggleText}>
                {isLoginMode
                  ? 'Need an account? Sign Up'
                  : 'Have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderOnboarding = () => {
    const slides = [
      {
        icon: Shield,
        iconColor: '#8b5cf6',
        title: 'Speak Without Fear',
        text: 'Your voice matters. Share your story completely anonymously. No tracking, no judgment.',
      },
      {
        icon: Users,
        iconColor: '#ec4899',
        title: 'You Are Not Alone',
        text: 'Join a community of thousands standing up against injustice. Read real stories from real people.',
      },
      {
        icon: Scale,
        iconColor: '#3b82f6',
        title: 'Demand Justice',
        text: 'Your reports help NGOs and activists track corruption and abuse patterns globally.',
      },
    ];

    const handleScroll = (event: any) => {
      const slideWidth = SCREEN_WIDTH;
      const offset = event.nativeEvent.contentOffset.x;
      const currentIndex = Math.round(offset / slideWidth);
      setCurrentSlide(currentIndex);
    };

    return (
      <SafeAreaView style={styles.onboardingContainer}>
        <StatusBar style="light" />
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {slides.map((slide, index) => {
            const IconComponent = slide.icon;
            return (
              <View key={index} style={styles.onboardingSlide}>
                {/* Background Decorative Elements */}
                <View style={styles.onboardingBackground}>
                  {/* Large gradient circles */}
                  <View
                    style={[
                      styles.onboardingCircle,
                      styles.onboardingCircle1,
                      { backgroundColor: slide.iconColor + '20' },
                    ]}
                  />
                  <View
                    style={[
                      styles.onboardingCircle,
                      styles.onboardingCircle2,
                      { backgroundColor: slide.iconColor + '15' },
                    ]}
                  />
                  <View
                    style={[
                      styles.onboardingCircle,
                      styles.onboardingCircle3,
                      { backgroundColor: slide.iconColor + '10' },
                    ]}
                  />
                  {/* Small accent circles */}
                  <View
                    style={[
                      styles.onboardingSmallCircle,
                      styles.onboardingSmallCircle1,
                      { backgroundColor: slide.iconColor + '25' },
                    ]}
                  />
                  <View
                    style={[
                      styles.onboardingSmallCircle,
                      styles.onboardingSmallCircle2,
                      { backgroundColor: slide.iconColor + '20' },
                    ]}
                  />
                  <View
                    style={[
                      styles.onboardingSmallCircle,
                      styles.onboardingSmallCircle3,
                      { backgroundColor: slide.iconColor + '15' },
                    ]}
                  />
                </View>

                {/* Content */}
                <View style={styles.onboardingContent}>
                  <View style={styles.onboardingIconContainer}>
                    <View
                      style={[
                        styles.onboardingIconBackground,
                        { backgroundColor: slide.iconColor + '20' },
                      ]}
                    >
                      <IconComponent size={80} color={slide.iconColor} />
                    </View>
                  </View>
                  <Text style={styles.onboardingTitle}>{slide.title}</Text>
                  <Text style={styles.onboardingText}>{slide.text}</Text>
                  {index === slides.length - 1 && (
                    <TouchableOpacity
                      style={styles.onboardingButton}
                      onPress={handleOnboardingComplete}
                    >
                      <Text style={styles.onboardingButtonText}>Get Started</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
        {/* Pagination Dots */}
        <View style={styles.onboardingDots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.onboardingDot,
                currentSlide === index && styles.onboardingDotActive,
              ]}
            />
          ))}
        </View>
      </SafeAreaView>
    );
  };

  // Show loading while checking auth or onboarding status
  if (isLoading || showOnboarding === null) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#60a5fa" />
        </View>
      </SafeAreaView>
    );
  }

  // Show auth view if not logged in
  if (!session) {
    return renderAuthView();
  }

  // Show onboarding if first launch (only after auth)
  if (showOnboarding) {
    return renderOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Main Content */}
      <View style={styles.content}>{renderTabContent()}</View>

      {/* Category Picker Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalOption,
                    category === cat && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      category === cat && styles.modalOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setCategoryModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'feed' && styles.navItemActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Home size={24} color={activeTab === 'feed' ? '#60a5fa' : '#64748b'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'feed' && styles.navLabelActive,
            ]}
          >
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'speak' && styles.navItemActive]}
          onPress={() => setActiveTab('speak')}
        >
          <PlusCircle size={24} color={activeTab === 'speak' ? '#60a5fa' : '#64748b'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'speak' && styles.navLabelActive,
            ]}
          >
            Speak
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'learn' && styles.navItemActive]}
          onPress={() => setActiveTab('learn')}
        >
          <BookOpen size={24} color={activeTab === 'learn' ? '#60a5fa' : '#64748b'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'learn' && styles.navLabelActive,
            ]}
          >
            Learn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'help' && styles.navItemActive]}
          onPress={() => setActiveTab('help')}
        >
          <HeartHandshake size={24} color={activeTab === 'help' ? '#60a5fa' : '#64748b'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'help' && styles.navLabelActive,
            ]}
          >
            Help
          </Text>
        </TouchableOpacity>

        {userRole === 'moderator' && (
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'admin' && styles.navItemActive]}
            onPress={() => setActiveTab('admin')}
          >
            <View style={styles.navIconContainer}>
              <Shield size={24} color={activeTab === 'admin' ? '#60a5fa' : '#64748b'} />
              {pendingCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === 'admin' && styles.navLabelActive,
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <UserCircle size={24} color={activeTab === 'profile' ? '#60a5fa' : '#64748b'} />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'profile' && styles.navLabelActive,
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  feedContainer: {
    flex: 1,
  },
  logoHeader: {
    width: 400,
    height: 180,
    marginTop: 40,
    alignSelf: 'center',
  },
  tabTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'left',
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    letterSpacing: -0.5,
  },
  impactDashboard: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  impactDashboardTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  impactStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  impactStatBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  impactStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  impactStatValue: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  impactStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  impactStatDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#334155',
    marginHorizontal: 8,
  },
  categoryFilterContainer: {
    marginVertical: 12,
    marginHorizontal: 12,
    marginBottom: 30,
  },
  categoryFilterContent: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#8b5cf6',
  },
  categoryChipText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#e2e8f0',
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  postAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  postAuthorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#334155',
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  postAuthorName: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  postAuthorRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postHeaderRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  postCategory: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    textAlign: 'right',
  },
  postDate: {
    color: '#64748b',
    fontSize: 12,
  },
  postLocation: {
    color: '#94a3b8',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  postTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  postContent: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionCount: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  actionCountActive: {
    color: '#60a5fa',
  },
  commentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  commentsSectionTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  commentsList: {
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  commentItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  commentTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  commentContent: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    color: '#64748b',
    fontSize: 11,
  },
  commentDeleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  commentLoader: {
    marginVertical: 16,
  },
  noCommentsText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f1f5f9',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  commentSendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  commentSendButtonDisabled: {
    opacity: 0.6,
  },
  commentSendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  verificationLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationToggle: {
    padding: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  verifiedBadgeText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  adminActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  speakContainer: {
    marginTop: 50,
    flex: 1,
  },
  speakContent: {
    padding: 20,
    paddingBottom: 40,
  },
  speakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  safetyInfoButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    flex: 1,
  },
  sectionSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 22,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 16,
  },
  locationInputContainer: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 32,
  },
  locationDetectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  locationDetectButtonText: {
    color: '#8b5cf6',
    fontSize: 13,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 150,
    paddingTop: 14,
  },
  categoryButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryButtonText: {
    color: '#f1f5f9',
    fontSize: 16,
  },
  categoryButtonArrow: {
    color: '#64748b',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  attachButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  attachButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#0f172a',
  },
  navLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  navIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalOptionSelected: {
    backgroundColor: '#0f172a',
  },
  modalOptionText: {
    color: '#e2e8f0',
    fontSize: 16,
  },
  modalOptionTextSelected: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#60a5fa',
    fontSize: 16,
    fontWeight: '600',
  },
  resourceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resourceImageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  resourceImage: {
    width: '100%',
    height: 140,
  },
  resourceImagePlaceholder: {
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resourceBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceContent: {
    padding: 16,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  resourceTitle: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  resourceDescription: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
  learnContentContainer: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  sdgCard: {
    marginHorizontal: 16,
    marginTop: 40,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sdgCardBackground: {
    width: '100%',
    minHeight: 280,
    justifyContent: 'flex-end',
  },
  sdgCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 58, 138, 0.75)',
  },
  sdgCardContent: {
    padding: 20,
    position: 'relative',
    zIndex: 1,
  },
  sdgBadge: {
    width: 48,
    height: 48,
    backgroundColor: '#1e40af',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  sdgBadgeText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  sdgCardTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  sdgCardDescription: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  sdgCardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  sdgCardCTAText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  helpHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  helpTitle: {
    color: '#f1f5f9',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 20,
    letterSpacing: -0.5,
  },
  helpSubtitle: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
  helplineCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
  },
  helplineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helplineIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  helplineTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  helplineName: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  helplineDescription: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  safetyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safetyModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  safetyModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  safetyModalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyModalTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  safetyModalBody: {
    marginBottom: 24,
  },
  safetyBulletPoint: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  safetyBullet: {
    color: '#8b5cf6',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  safetyText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
  },
  safetyModalButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyModalButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  onboardingSlide: {
    width: SCREEN_WIDTH,
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  onboardingBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 120,
    zIndex: 1,
  },
  onboardingCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  onboardingCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
    opacity: 0.6,
  },
  onboardingCircle2: {
    width: 250,
    height: 250,
    bottom: -80,
    left: -80,
    opacity: 0.5,
  },
  onboardingCircle3: {
    width: 200,
    height: 200,
    top: '40%',
    left: -50,
    opacity: 0.4,
  },
  onboardingSmallCircle: {
    position: 'absolute',
    borderRadius: 9999,
    width: 80,
    height: 80,
  },
  onboardingSmallCircle1: {
    top: '20%',
    right: 40,
    opacity: 0.5,
  },
  onboardingSmallCircle2: {
    bottom: '25%',
    right: 60,
    opacity: 0.4,
  },
  onboardingSmallCircle3: {
    top: '60%',
    left: 30,
    opacity: 0.3,
  },
  onboardingIconContainer: {
    marginBottom: 40,
  },
  onboardingIconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  onboardingText: {
    fontSize: 18,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  onboardingButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginTop: 20,
  },
  onboardingButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  onboardingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    gap: 8,
  },
  onboardingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  onboardingDotActive: {
    width: 24,
    backgroundColor: '#8b5cf6',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  authHeader: {
    alignItems: 'flex-start',
    marginBottom: 40,
    width: '100%',
  },
  authLogo: {
    width: 400,
    height: 180,
    marginBottom: 24,
    alignSelf: 'center',
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
    textAlign: 'left',
    alignSelf: 'flex-start',
    width: '100%',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'left',
    alignSelf: 'flex-start',
    width: '100%',
  },
  authForm: {
    width: '100%',
  },
  authInputContainer: {
    marginBottom: 24,
  },
  authInputLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#CCCCCC',
    marginBottom: 8,
  },
  authInputWrapper: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 52,
  },
  authInputIcon: {
    marginRight: 12,
  },
  authInput: {
    flex: 1,
    fontSize: 16,
    color: '#f1f5f9',
    paddingVertical: 12,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  authButtonArrow: {
    marginLeft: 4,
  },
  authToggleButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  authToggleText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '500',
  },
  feedHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  feedHeaderLeft: {
    flex: 1,
  },
  signOutButton: {
    padding: 8,
    marginRight: 4,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  accessDeniedButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  accessDeniedButtonText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
  profileScrollView: {
    flex: 1,
  },
  profileContent: {
    paddingTop: 50,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  profileAvatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#334155',
  },
  profileEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 12,
    textAlign: 'center',
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileRoleBadgeModerator: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  profileRoleBadgeUser: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderColor: '#64748b',
  },
  profileRoleText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  profileStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
  },
  profileStatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#60a5fa',
    marginBottom: 8,
  },
  profileStatLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  profileActivityContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  profileTabSelector: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileTabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  profileTabButtonActive: {
    backgroundColor: '#0f172a',
  },
  profileTabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  profileTabButtonTextActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  profileActivityItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  profileActivityItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  profileActivityItemContent: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 8,
    lineHeight: 20,
  },
  profileActivityItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileActivityItemDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  profileActivityItemStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileActivityItemStatusApproved: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  profileActivityItemStatusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  profileActivityItemStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  profileActivityItemStatusTextApproved: {
    color: '#22c55e',
  },
  profileActivityItemStatusTextPending: {
    color: '#fbbf24',
  },
  profileSignOutButton: {
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  profileSignOutButtonText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
  },
});
