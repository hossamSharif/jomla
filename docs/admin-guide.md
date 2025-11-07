# Jomla Admin Dashboard User Manual

**Version**: 1.0.0
**Last Updated**: 2025-11-07
**For**: Admin Dashboard Users

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Products](#managing-products)
4. [Managing Offers](#managing-offers)
5. [Managing Orders](#managing-orders)
6. [User Management](#user-management)
7. [Reports & Analytics](#reports--analytics)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Dashboard

1. **URL**: Navigate to your admin dashboard URL (e.g., `https://admin.jomla.com`)
2. **Login**: Enter your admin email and password
3. **Two-Factor Authentication**: If enabled, enter your 2FA code

### Your First Login

When you first log in, you'll see:
- **Dashboard Homepage**: Overview of key metrics
- **Navigation Menu**: Access to all admin functions
- **Profile Settings**: Manage your account

---

## Dashboard Overview

### Homepage Widgets

The dashboard displays:

#### Key Metrics
- **Total Orders Today**: Number of orders placed
- **Pending Orders**: Orders awaiting confirmation
- **Revenue Today**: Total sales for the current day
- **Active Products**: Products currently available
- **Active Offers**: Live promotional offers

#### Recent Activity
- Latest orders
- Recent product updates
- New customer registrations

### Navigation Menu

Located on the left sidebar:
- 🏠 **Dashboard**: Homepage
- 📦 **Products**: Manage product catalog
- 🎁 **Offers**: Create and manage promotional offers
- 🛒 **Orders**: View and process orders
- 👥 **Customers**: View customer information
- ⚙️ **Settings**: Admin settings and user management

---

## Managing Products

### Viewing Products

1. Click **Products** in the navigation menu
2. You'll see a table with all products:
   - Product name
   - Category
   - Base price
   - Stock status
   - Status (Active/Inactive)

**Filter Options**:
- Search by product name
- Filter by category
- Filter by status (Active/Inactive)
- Filter by stock status

### Adding a New Product

1. Click **"+ Add Product"** button
2. Fill in the product form:

**Required Fields**:
- **Product Name**: Clear, descriptive name
- **Description**: Detailed product description
- **Category**: Select from dropdown (Dairy, Produce, Bakery, etc.)
- **Base Price**: Enter price in dollars (e.g., 2.99)
- **Min Quantity**: Minimum order quantity (default: 1)
- **Max Quantity**: Maximum order quantity per order

**Optional Fields**:
- **Tags**: Add searchable keywords
- **Product Image**: Upload high-quality image (recommended: 800x800px)

3. Click **"Save Product"**

**Best Practices**:
- Use clear, high-resolution images
- Write detailed descriptions
- Set realistic quantity limits
- Use consistent naming conventions

### Editing Products

1. Find the product in the list
2. Click the **Edit** icon (pencil)
3. Update the fields you want to change
4. Click **"Update Product"**

**Important**: Price changes affect future orders only, not existing orders.

### Managing Product Images

**Upload New Image**:
1. Click **"Upload Image"** in the product form
2. Select image file (JPG, PNG, or WebP)
3. Image will be automatically optimized
4. Thumbnail generated automatically

**Image Requirements**:
- Max size: 10 MB
- Recommended dimensions: 800x800px
- Supported formats: JPG, PNG, WebP

### Deactivating Products

To temporarily hide a product:
1. Find the product
2. Toggle the **Status** switch to "Inactive"
3. Product will no longer appear in the mobile app

**Note**: Deactivating a product does NOT delete it. You can reactivate it anytime.

### Deleting Products

**Warning**: Deletion is permanent!

1. Click the **Delete** icon (trash)
2. Confirm deletion in the popup
3. Product is permanently removed

**Before Deleting**:
- Check if product is in any active offers
- Review order history
- Consider deactivating instead

---

## Managing Offers

### Understanding Offers

Offers are bundles of products sold at discounted prices. Each offer contains:
- Multiple products
- Individual discount for each product
- Total savings calculation
- Validity period (optional)
- Quantity limits

### Viewing Offers

1. Click **Offers** in the navigation menu
2. See all offers with:
   - Offer name
   - Number of products
   - Total savings
   - Status (Draft/Active/Inactive)
   - Validity period

### Creating a New Offer

1. Click **"+ Create Offer"** button

2. **Basic Information**:
   - **Offer Name**: Catchy, descriptive name (e.g., "Weekend Breakfast Bundle")
   - **Description**: Explain the value proposition
   - **Offer Image**: Upload promotional image

3. **Add Products**:
   - Click **"Add Product"**
   - Select product from dropdown
   - Set **Base Price** (original price - read-only)
   - Set **Discounted Price** (sale price)
   - Discount percentage calculates automatically
   - Repeat for all products in the bundle

4. **Pricing Summary** (Auto-calculated):
   - Original Total: Sum of all base prices
   - Discounted Total: Sum of all sale prices
   - Total Savings: Amount customers save
   - Savings Percentage: Overall discount

5. **Quantity Limits**:
   - **Min Quantity**: Minimum bundles per order (default: 1)
   - **Max Quantity**: Maximum bundles per order

6. **Validity Period** (Optional):
   - **Valid From**: Offer start date/time
   - **Valid Until**: Offer end date/time
   - Leave blank for no expiration

7. **Status**:
   - **Draft**: Not visible to customers (for preparation)
   - **Active**: Live in mobile app
   - **Inactive**: Temporarily hidden

8. Click **"Create Offer"**

### Editing Offers

1. Find the offer
2. Click **Edit**
3. Modify any fields
4. Click **"Update Offer"**

**Important Warnings**:
- Modifying active offers affects existing carts
- Users with the offer in their cart will see a warning
- Price changes apply immediately

### Activating/Deactivating Offers

**To Activate**:
1. Set status to **Active**
2. Ensure validity dates are correct
3. Offer appears in mobile app immediately

**To Deactivate**:
1. Set status to **Inactive**
2. Offer disappears from mobile app
3. Existing carts may become invalid

### Offer Best Practices

**Discount Strategy**:
- Offer meaningful savings (at least 10%)
- Balance profitability with customer value
- Use tiered discounts for high-value bundles

**Product Selection**:
- Combine complementary products
- Mix high-margin and low-margin items
- Create themed bundles (breakfast, dinner, etc.)

**Timing**:
- Weekend specials: Friday-Sunday
- Holiday bundles: Align with holidays
- Seasonal offers: Fresh produce bundles

**Naming**:
- Clear and descriptive
- Include benefit (e.g., "Save $10")
- Use action words (e.g., "Ultimate", "Complete")

---

## Managing Orders

### Order Lifecycle

Orders progress through these states:
1. **Pending**: Order placed, awaiting confirmation
2. **Confirmed**: Admin confirmed order
3. **Preparing**: Order being prepared
4. **Out for Delivery** (Delivery) / **Ready for Pickup** (Pickup)
5. **Completed**: Order delivered/picked up
6. **Cancelled**: Order cancelled

### Viewing Orders

1. Click **Orders** in navigation
2. See all orders with:
   - Order number (e.g., ORD-20251107-0001)
   - Customer name
   - Order total
   - Status
   - Fulfillment method (Delivery/Pickup)
   - Order date

**Filter Options**:
- By status
- By date range
- By fulfillment method
- Search by order number or customer name

### Order Details

Click an order to see:

**Customer Information**:
- Name, email, phone number
- Delivery address (for delivery orders)
- Pickup time (for pickup orders)

**Order Items**:
- Products (with quantities and prices)
- Offers (expanded to show bundled products)
- Subtotal, savings, delivery fee, tax, total

**Order Status History**:
- Timeline of status changes
- Who made each change
- Timestamps

**Actions**:
- Update order status
- Download invoice
- Contact customer
- Cancel order

### Processing Orders

#### 1. Confirming New Orders

When a new order arrives:
1. Review order details
2. Check stock availability
3. Update status to **Confirmed**
4. Customer receives notification

#### 2. Preparing Orders

Once confirmed:
1. Print order details
2. Gather products
3. Update status to **Preparing**

#### 3. Delivery Orders

1. Prepare order for delivery
2. Assign to delivery driver
3. Update status to **Out for Delivery**
4. Mark as **Completed** when delivered

**Delivery Details Include**:
- Full address
- City, postal code
- Delivery notes/instructions
- Customer contact number

#### 4. Pickup Orders

1. Prepare order
2. Update status to **Ready for Pickup**
3. Notify customer
4. Mark as **Completed** when picked up

**Pickup Details Include**:
- Requested pickup time
- Pickup location
- Customer contact number

### Updating Order Status

1. Open order details
2. Click **Status** dropdown
3. Select new status
4. Click **Update**
5. Customer receives automatic notification

**Valid Transitions**:
- Pending → Confirmed or Cancelled
- Confirmed → Preparing or Cancelled
- Preparing → Out for Delivery/Ready for Pickup
- Out for Delivery/Ready for Pickup → Completed

### Cancelling Orders

**Before Cancelling**:
- Contact customer to confirm
- Document reason for cancellation

**To Cancel**:
1. Open order
2. Click **"Cancel Order"**
3. Enter cancellation reason
4. Confirm cancellation

**Effects**:
- Customer notified via app
- Refund processed (if payment collected)
- Order cannot be resumed

### Downloading Invoices

1. Open order details
2. Click **"Download Invoice"**
3. PDF downloads automatically

**Invoice Contents**:
- Order number and date
- Customer information
- Itemized list with prices
- Offer product breakdowns
- Subtotal, fees, taxes, total
- Payment information

---

## User Management

### Admin Users

#### Viewing Admin Users

1. Go to **Settings** → **Admin Users**
2. See list of all admin accounts

#### Admin Roles

**Super Admin**:
- Full access to all features
- Can create/edit/delete admins
- Can manage settings

**Admin**:
- Can manage products, offers, orders
- Cannot manage other admins

**Viewer**:
- Read-only access
- Cannot make changes

#### Adding New Admin

**Requires**: Super Admin role

1. Click **"+ Add Admin"**
2. Enter:
   - Email address
   - First and last name
   - Role
   - Permissions
3. Click **"Create Admin"**
4. Temporary password sent to email

#### Editing Admin Users

1. Find admin in list
2. Click **Edit**
3. Update role or permissions
4. Click **Save**

#### Deactivating Admin Users

Instead of deleting:
1. Toggle **Active** status to off
2. User cannot log in
3. Can reactivate later

### Customer Management

#### Viewing Customers

1. Go to **Customers**
2. See list with:
   - Name
   - Email
   - Phone number
   - Registration date
   - Total orders
   - Total spent

#### Customer Details

Click a customer to see:
- Contact information
- Order history
- Total lifetime value
- Account status

**Actions**:
- View order history
- Contact customer
- Deactivate account (if needed)

---

## Reports & Analytics

### Order Reports

**Daily Summary**:
- Total orders
- Total revenue
- Average order value
- Top products

**Date Range Reports**:
1. Select start and end dates
2. Click **"Generate Report"**
3. View or download as CSV

### Product Performance

- Best-selling products
- Slow-moving inventory
- Stock alerts

### Offer Performance

- Most popular offers
- Conversion rates
- Savings impact on sales

---

## Troubleshooting

### Common Issues

#### Can't Log In
- **Check**: Email and password correct
- **Try**: Password reset
- **Contact**: Super admin for account issues

#### Order Not Updating
- **Check**: Internet connection
- **Try**: Refresh browser
- **Clear**: Browser cache

#### Image Won't Upload
- **Check**: File size < 10 MB
- **Check**: File format (JPG, PNG, WebP)
- **Try**: Compressing image first

#### Offer Not Showing in App
- **Check**: Status is "Active"
- **Check**: Validity dates are current
- **Check**: At least one product in offer
- **Wait**: Up to 5 minutes for cache refresh

### Getting Help

**Documentation**:
- This user manual
- Video tutorials (if available)
- FAQ section

**Support**:
- Email: support@jomla.com
- Phone: [Support phone]
- Live chat: [If available]

**Technical Issues**:
- Report bugs via support email
- Include screenshots
- Describe steps to reproduce

---

## Best Practices

### Daily Tasks

**Morning**:
- Review new orders
- Confirm pending orders
- Check stock levels
- Respond to urgent messages

**Throughout Day**:
- Update order statuses
- Process new orders
- Monitor active offers

**End of Day**:
- Review completed orders
- Generate daily report
- Plan next day's specials

### Weekly Tasks

- Review product performance
- Update offer schedule
- Analyze sales trends
- Plan upcoming promotions

### Security

**Password Security**:
- Use strong, unique passwords
- Change password every 90 days
- Never share credentials

**Account Security**:
- Log out when finished
- Don't use public computers
- Enable 2FA if available

**Data Privacy**:
- Handle customer data responsibly
- Don't share customer information
- Follow data protection regulations

---

## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save (in forms)
- **Esc**: Close modal
- **Ctrl/Cmd + F**: Search (in tables)

---

## Appendix

### Product Categories

Standard categories:
- Dairy
- Produce
- Bakery
- Meat & Seafood
- Pantry
- Beverages
- Frozen
- Snacks
- Health & Beauty
- Household

### Order Status Definitions

- **Pending**: Customer placed order, not yet confirmed
- **Confirmed**: Admin accepted order, preparing to fulfill
- **Preparing**: Order being packed/prepared
- **Out for Delivery**: Order en route to customer
- **Ready for Pickup**: Order ready for customer collection
- **Completed**: Order successfully fulfilled
- **Cancelled**: Order cancelled before completion

---

**End of Admin User Manual**

For additional help, contact support@jomla.com
