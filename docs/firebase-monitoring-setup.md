# Firebase Cloud Functions Monitoring and Alerting Setup

**Purpose**: Configure monitoring and alerting for Firebase Cloud Functions to detect and respond to failures quickly.

**Last Updated**: 2025-11-07

---

## Overview

This guide covers setting up monitoring and alerting for all Cloud Functions in the Jomla grocery store app. Proper monitoring ensures:
- Quick detection of failed function executions
- Performance degradation alerts
- Cost anomaly detection
- Proactive incident response

---

## Prerequisites

- Firebase project with Cloud Functions deployed
- Google Cloud Console access (same project)
- Appropriate IAM permissions (Cloud Functions Admin, Monitoring Viewer)
- Email or Slack webhook for alert notifications

---

## 1. Cloud Function Metrics to Monitor

### Critical Metrics

| Metric | Threshold | Alert Condition | Action Required |
|--------|-----------|-----------------|-----------------|
| **Execution Count** | N/A | Unexpected drops | Check deployment status |
| **Execution Time** | >10s (p95) | Sustained high latency | Optimize function code |
| **Error Rate** | >5% | Errors spike above baseline | Investigate logs |
| **Active Instances** | >50 | Unusually high | Check for DDoS or loops |
| **Memory Usage** | >80% | Approaching limit | Increase memory allocation |
| **Cold Start Rate** | >30% | High cold starts | Consider min instances |

### Per-Function Alerts

#### Authentication Functions
- `sendVerificationCode`: Error rate >3% (SMS delivery critical)
- `verifyCode`: Execution time >2s (user experience impact)
- `resetPassword`: Error rate >5%

#### Order Functions
- `createOrder`: Error rate >2% (revenue impact)
- `generateInvoice`: Execution time >5s (SLA: <5s)

#### Notification Functions
- `sendOfferNotification`: Error rate >5%
- `sendOrderStatusNotification`: Error rate >3%

#### Scheduled Functions
- `cleanupExpiredVerificationCodes`: Execution failures (must run hourly)

---

## 2. Firebase Console Setup

### Step 1: Enable Cloud Logging

1. Navigate to **Firebase Console** → **Functions**
2. Select any function → **Logs** tab
3. Verify logs are appearing (run test functions if needed)
4. Logs are automatically enabled - no action needed

### Step 2: View Function Metrics

1. Go to **Firebase Console** → **Functions** → **Dashboard**
2. Review default metrics:
   - Invocations per function
   - Execution time (median, p95)
   - Error count
   - Memory usage
3. Click any function to see detailed metrics

### Step 3: Create Log-Based Metrics (Optional)

For custom metrics based on log patterns:

1. Open **Google Cloud Console** → **Logging** → **Logs Explorer**
2. Filter logs by function:
   ```
   resource.type="cloud_function"
   resource.labels.function_name="sendVerificationCode"
   severity>=ERROR
   ```
3. Click **Create Metric** from query results
4. Configure:
   - **Name**: `failed_verification_sends`
   - **Type**: Counter
   - **Filter**: (use the query above)
5. Save metric

---

## 3. Google Cloud Monitoring Setup

### Step 1: Access Cloud Monitoring

1. Open **Google Cloud Console** → **Monitoring** → **Alerting**
2. Ensure the correct Firebase project is selected

### Step 2: Create Alert Policies

#### Alert 1: High Error Rate (Critical Functions)

1. Click **Create Policy**
2. **Add Condition**:
   - **Resource Type**: Cloud Function
   - **Metric**: `function/execution_count` (filter by `status=error`)
   - **Condition**: Threshold
   - **Threshold Value**: Rate > 5 errors/minute
   - **Duration**: 5 minutes
   - **Functions**: `createOrder`, `sendVerificationCode`, `verifyCode`
3. **Notifications**:
   - Add notification channel (email, Slack, PagerDuty)
   - Subject: `[CRITICAL] High Error Rate in {{resource.label.function_name}}`
   - Message:
     ```
     Function: {{resource.label.function_name}}
     Error Rate: {{value}} errors/min
     Region: {{resource.label.region}}

     View Logs: https://console.cloud.google.com/logs/query
     ```
4. **Documentation**: Add runbook link or troubleshooting steps
5. **Name**: `Cloud Functions - High Error Rate (Critical)`
6. Click **Save**

#### Alert 2: Execution Time Degradation

1. Click **Create Policy**
2. **Add Condition**:
   - **Resource Type**: Cloud Function
   - **Metric**: `function/execution_times` (p95)
   - **Condition**: Threshold
   - **Threshold Value**: > 10,000 ms (10 seconds)
   - **Duration**: 10 minutes
3. **Notifications**: Same as Alert 1
4. **Name**: `Cloud Functions - High Latency (p95 > 10s)`
5. Click **Save**

#### Alert 3: Scheduled Function Failures

1. Click **Create Policy**
2. **Add Condition**:
   - **Resource Type**: Cloud Function
   - **Metric**: `function/execution_count` (filter by `status=error`)
   - **Condition**: Threshold
   - **Threshold Value**: > 0 errors
   - **Duration**: 1 hour
   - **Functions**: `cleanupExpiredVerificationCodes`
3. **Notifications**: Same as Alert 1
4. **Name**: `Cloud Functions - Scheduled Job Failure`
5. Click **Save**

#### Alert 4: Memory Limit Approaching

1. Click **Create Policy**
2. **Add Condition**:
   - **Resource Type**: Cloud Function
   - **Metric**: `function/user_memory_bytes`
   - **Condition**: Threshold
   - **Threshold Value**: > 80% of allocated memory (e.g., 204MB for 256MB functions)
   - **Duration**: 5 minutes
3. **Notifications**: Same as Alert 1
4. **Name**: `Cloud Functions - High Memory Usage`
5. Click **Save**

---

## 4. Notification Channels

### Email Notifications

1. Go to **Monitoring** → **Alerting** → **Notification Channels**
2. Click **Add New** → **Email**
3. Enter:
   - **Display Name**: `Dev Team - Critical Alerts`
   - **Email Address**: `dev-team@jomla.com`
4. Click **Save**

### Slack Integration (Recommended)

1. Create a Slack webhook:
   - Go to Slack → **Apps** → **Incoming Webhooks**
   - Create webhook for `#alerts` channel
   - Copy webhook URL
2. In Google Cloud Monitoring:
   - **Notification Channels** → **Add New** → **Slack**
   - **Display Name**: `Slack - #alerts`
   - **Webhook URL**: (paste webhook URL)
3. Test the channel and save

### PagerDuty (Production)

1. Get PagerDuty integration key from your PagerDuty account
2. In Google Cloud Monitoring:
   - **Notification Channels** → **Add New** → **PagerDuty**
   - **Display Name**: `PagerDuty - On-Call`
   - **Service Key**: (paste integration key)
3. Test and save

---

## 5. Dashboard Setup

### Create Custom Dashboard

1. Go to **Monitoring** → **Dashboards** → **Create Dashboard**
2. **Name**: `Jomla Cloud Functions Health`
3. Add charts:

#### Chart 1: Function Invocations
- **Type**: Line chart
- **Metric**: `function/execution_count`
- **Group By**: `function_name`
- **Time Range**: 1 hour

#### Chart 2: Error Rate by Function
- **Type**: Stacked bar chart
- **Metric**: `function/execution_count` (filter: `status=error`)
- **Group By**: `function_name`
- **Time Range**: 1 hour

#### Chart 3: Execution Time (p95)
- **Type**: Line chart
- **Metric**: `function/execution_times` (p95 percentile)
- **Group By**: `function_name`
- **Time Range**: 1 hour

#### Chart 4: Active Instances
- **Type**: Area chart
- **Metric**: `function/active_instances`
- **Group By**: `function_name`
- **Time Range**: 1 hour

#### Chart 5: Memory Usage
- **Type**: Heatmap
- **Metric**: `function/user_memory_bytes`
- **Group By**: `function_name`
- **Time Range**: 1 hour

4. Click **Save Dashboard**

---

## 6. Log Analysis and Debugging

### Useful Log Queries

#### All Errors in Last 24 Hours
```
resource.type="cloud_function"
severity>=ERROR
timestamp>="2025-11-06T00:00:00Z"
```

#### Failed Order Creations
```
resource.type="cloud_function"
resource.labels.function_name="createOrder"
severity>=ERROR
```

#### Slow Execution (>5s)
```
resource.type="cloud_function"
jsonPayload.executionTime>5000
```

#### Verification Code Cleanup Stats
```
resource.type="cloud_function"
resource.labels.function_name="cleanupExpiredVerificationCodes"
textPayload:"cleaned"
```

### Export Logs to BigQuery (Long-Term Analysis)

1. Go to **Logging** → **Log Router** → **Create Sink**
2. **Sink Name**: `functions-logs-to-bigquery`
3. **Sink Service**: BigQuery
4. **Dataset**: Create new dataset `cloud_function_logs`
5. **Filter**:
   ```
   resource.type="cloud_function"
   severity>=WARNING
   ```
6. Click **Create Sink**

---

## 7. Cost Monitoring

### Set Budget Alerts

1. Go to **Billing** → **Budgets & Alerts**
2. Click **Create Budget**
3. Configure:
   - **Name**: `Cloud Functions Monthly Budget`
   - **Projects**: Select Firebase project
   - **Services**: Cloud Functions
   - **Budget Amount**: $100/month (adjust as needed)
   - **Threshold Rules**:
     - 50% → Email notification
     - 80% → Email + Slack notification
     - 100% → Critical alert
4. Click **Save**

### Monitor Function Costs

1. Go to **Cloud Console** → **Cloud Functions** → **Metrics**
2. Select **Costs** tab
3. Review per-function costs:
   - Invocation count × pricing tier
   - Network egress charges
   - Cold start overhead

---

## 8. Maintenance and Best Practices

### Daily
- [ ] Review error logs in Firebase Console (5 min)
- [ ] Check alert notifications for patterns

### Weekly
- [ ] Review dashboard metrics for anomalies
- [ ] Verify scheduled function executions (`cleanupExpiredVerificationCodes`)
- [ ] Check function execution time trends

### Monthly
- [ ] Review billing report for cost anomalies
- [ ] Update alert thresholds based on traffic patterns
- [ ] Archive old logs (if using BigQuery export)

### Quarterly
- [ ] Conduct incident response drill
- [ ] Review and update alert runbooks
- [ ] Audit notification channels (remove inactive users)

---

## 9. Incident Response Runbook

### When Alert Fires

1. **Acknowledge Alert**: Confirm receipt (PagerDuty/Slack)
2. **Assess Severity**:
   - Critical: Revenue-impacting (`createOrder`, `generateInvoice`)
   - High: User-impacting (`sendVerificationCode`, notifications)
   - Medium: Background jobs (`cleanupExpiredVerificationCodes`)
3. **Check Logs**:
   - Firebase Console → Functions → Logs
   - Filter by function name and time range
   - Look for error patterns
4. **Common Issues**:

   | Error Pattern | Likely Cause | Fix |
   |--------------|--------------|-----|
   | `Twilio credentials not configured` | Missing env vars | Redeploy with correct .env |
   | `Deadline exceeded` | Timeout (60s default) | Increase timeout or optimize code |
   | `Resource exhausted` | Too many invocations | Enable min instances or rate limiting |
   | `Permission denied` | Firestore rules issue | Review rules in firebase/firestore.rules |
   | `Firebase Admin not initialized` | Cold start issue | Add retry logic or min instances |

5. **Mitigation**:
   - Rollback deployment if recent change caused issue
   - Disable non-critical functions temporarily
   - Scale up resources (increase memory/timeout)
6. **Post-Incident**:
   - Document root cause
   - Create follow-up tasks (bug fixes, monitoring improvements)
   - Update runbook with new learnings

---

## 10. Deployment Checklist

Before deploying new functions:

- [ ] Test function locally with Firebase emulators
- [ ] Review function logs during testing
- [ ] Verify environment variables are set
- [ ] Deploy to staging environment first (if available)
- [ ] Monitor logs for 10 minutes after deployment
- [ ] Verify alert policies include new functions
- [ ] Update dashboard to include new function metrics

---

## References

- [Firebase Cloud Functions Monitoring](https://firebase.google.com/docs/functions/monitoring)
- [Google Cloud Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Cloud Functions Quotas and Limits](https://cloud.google.com/functions/quotas)
- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)

---

## Support

For questions or issues with monitoring setup:
- **Firebase Support**: https://firebase.google.com/support
- **Stack Overflow**: Tag `firebase-cloud-functions` + `google-cloud-monitoring`
- **Internal Team**: dev-team@jomla.com
