import { db } from "@/lib/db";
import { analyzeComment, detectProductDemand } from "@/lib/ai/openai";
import { telegramProvider } from "@/lib/messaging/telegram";
import type { Platform } from "@prisma/client";

export class MarketingService {
  async analyzeAndReplyComments(postId: string) {
    const comments = await db.marketingComment.findMany({
      where: { postId, isReplied: false },
      take: 50,
    });

    const results = [];
    for (const comment of comments) {
      const analysis = await analyzeComment(comment.text);

      await db.marketingComment.update({
        where: { id: comment.id },
        data: {
          sentiment: analysis.sentiment,
          aiReply: analysis.suggestedReply,
        },
      });

      results.push({ commentId: comment.id, ...analysis });
    }

    return results;
  }

  async autoReplyPositiveComments(postId: string) {
    const positiveComments = await db.marketingComment.findMany({
      where: { postId, sentiment: "POSITIVE", isReplied: false, aiReply: { not: null } },
    });

    for (const comment of positiveComments) {
      await db.marketingComment.update({
        where: { id: comment.id },
        data: { isReplied: true, repliedAt: new Date() },
      });
    }

    return positiveComments.length;
  }

  async detectDemandFromComments(postId: string) {
    const comments = await db.marketingComment.findMany({
      where: { postId },
      select: { text: true },
    });

    if (comments.length === 0) return null;

    const result = await detectProductDemand(comments.map((c) => c.text));
    return result;
  }

  async getPostAnalytics(platform?: Platform) {
    const where = platform ? { platform } : {};

    const posts = await db.marketingPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: 20,
      include: { _count: { select: { postComments: true } } },
    });

    const platformStats = await db.marketingPost.groupBy({
      by: ["platform"],
      _sum: { likes: true, shares: true, reach: true, impressions: true },
      _count: true,
    });

    return { posts, platformStats };
  }

  async createPost(data: {
    platform: Platform;
    content: string;
    title?: string;
    mediaUrls?: string[];
    campaignId?: string;
  }) {
    return db.marketingPost.create({ data });
  }

  async syncSocialMetrics(postId: string, metrics: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
  }) {
    return db.marketingPost.update({
      where: { id: postId },
      data: metrics,
    });
  }

  async broadcastCampaign(campaignId: string, channel: "TELEGRAM" | "SMS") {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { posts: { take: 1, orderBy: { createdAt: "desc" } } },
    });
    if (!campaign) throw new Error("NOT_FOUND");

    const post = campaign.posts[0];
    if (!post) throw new Error("No post found for campaign");

    const clients = await db.client.findMany({
      where: { status: { in: ["ACTIVE", "INACTIVE"] } },
      select: { id: true, name: true, phone: true, telegramId: true },
    });

    if (channel === "TELEGRAM") {
      const recipients = clients
        .filter((c) => c.telegramId)
        .map((c) => ({
          chatId: c.telegramId!,
          message: post.content,
        }));
      return telegramProvider.sendBulk(recipients);
    }

    return { sent: 0, message: "Channel not supported yet" };
  }
}

export const marketingService = new MarketingService();
