# Search and AI discovery

Production URL defaults to `https://www.aolbeam.com` (the existing public domain). If a different canonical domain is chosen, set `NEXT_PUBLIC_SITE_URL` in the hosting environment and rebuild. Configure the host to redirect other domain variants to the chosen domain.

## Included in the app

- `/practice`: public, server-rendered guide with subject examples, topic links, usage explanation and learner questions.
- `/llms.txt`: factual Markdown overview for AI tools; `/llm.txt` is a compatibility alias. Both are public without a Supabase auth round trip.
- `/robots.txt`: allows public crawling (including PerplexityBot under the wildcard rule), excludes private/application routes, and links to `/sitemap.xml`.
- `/sitemap.xml`: public launched informational pages only. Excludes hidden features and personal courses/chats.
- Homepage and practice canonical URLs, Open Graph/Twitter metadata, factual WebSite/SoftwareApplication/WebPage structured data. No invented reviews, ratings, exam affiliations or prices.
- Private application routes send `X-Robots-Tag: noindex`. Robots rules are crawler guidance, never an authorization boundary.

## After deployment

1. Check that the canonical public domain serves `/`, `/practice`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` and `/llm.txt` with HTTP 200 without login. Confirm CDN/WAF rules allow legitimate search crawlers; robots.txt alone cannot override firewall blocking.
2. Verify domain ownership in Google Search Console and Bing Webmaster Tools, then submit `/sitemap.xml`. Use URL inspection for the homepage and practice guide. Ownership verification requires the site owner's account; no submissions have been made automatically.
3. Keep the public subject examples and feature descriptions current. Add useful original study guides when there is actual content to publish, rather than mass-generating keyword pages.
4. Earn relevant external links: add the canonical site to the creator's existing profile/GitHub project description; share a worked study example with a real demo; ask educators or study communities that find it useful to include it in their resource lists. Respect each community's promotion rules. No external posts, messages, directory submissions or purchased links were created by this change.

`llms.txt` is an optional proposal, not a promise of inclusion in AI answers. Google says it ignores these files for visibility/rankings. Crawl access, useful public content and real references from other sites are the foundation. Indexing and recommendation are controlled by each search service.

References:
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://docs.perplexity.ai/docs/resources/perplexity-crawlers
- https://llmstxt.org/
