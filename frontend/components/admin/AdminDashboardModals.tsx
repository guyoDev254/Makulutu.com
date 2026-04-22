'use client'

import { Lock, X, Loader2, Save, ExternalLink, RotateCcw } from 'lucide-react'
import type { AdminDashboardModel } from '@/components/admin/adminDashboardTypes'

export function AdminDashboardModals({ admin }: { admin: AdminDashboardModel }) {
  const {
    showChangePasswordModal,
    setShowChangePasswordModal,
    changePasswordForm,
    setChangePasswordForm,
    changePasswordLoading,
    handleChangePassword,
    editingUser,
    setEditingUser,
    editUserForm,
    setEditUserForm,
    handleSaveUser,
    editingSubscription,
    setEditingSubscription,
    editSubscriptionForm,
    setEditSubscriptionForm,
    calculateDiscountedAmount,
    handleSaveSubscription,
    editingPayment,
    setEditingPayment,
    editPaymentForm,
    setEditPaymentForm,
    handleSavePayment,
    handleEditPayment,
    tierPurchaseDetailOpen,
    tierPurchaseDetail,
    tierPurchaseDetailLoading,
    closeTierPurchaseDetail,
    replayPaymentObsAlert,
    replayingPaymentId,
    isAdminOrSuper,
    formatAmountForRole,
    formatDate,
    shoutoutPlatformLabel,
    getStatusBadge,
    creatingSubscription,
    setCreatingSubscription,
    newSubscriptionForm,
    setNewSubscriptionForm,
    users,
    handleCreateSubscription,
    formatCurrency,
  } = admin

  return (
    <>
      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Change password
              </h2>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false)
                  setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current password</label>
                <input
                  type="password"
                  value={changePasswordForm.oldPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
                <input
                  type="password"
                  value={changePasswordForm.newPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm new password</label>
                <input
                  type="password"
                  value={changePasswordForm.confirmPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false)
                    setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {changePasswordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Change password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">TikTok Username</label>
                <input
                  type="text"
                  value={editUserForm.tiktokUsername}
                  onChange={(e) => setEditUserForm({...editUserForm, tiktokUsername: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">M-Pesa Mobile</label>
                <input
                  type="text"
                  value={editUserForm.mpesaMobile}
                  onChange={(e) => setEditUserForm({...editUserForm, mpesaMobile: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  value={editUserForm.whatsappNumber}
                  onChange={(e) => setEditUserForm({...editUserForm, whatsappNumber: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editUserForm.isActive}
                  onChange={(e) => setEditUserForm({...editUserForm, isActive: e.target.checked})}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-300">Active User</label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Subscription</h2>
              <button
                onClick={() => setEditingSubscription(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <strong>User:</strong> {editingSubscription.user?.name} (@{editingSubscription.user?.tiktokUsername})
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                  <input
                    type="number"
                    min="1"
                    value={editSubscriptionForm.months}
                    onChange={(e) => {
                      const months = e.target.value
                      const start = new Date(editSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(months))
                      setEditSubscriptionForm({
                        ...editSubscriptionForm,
                        months,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={editSubscriptionForm.status}
                    onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editSubscriptionForm.amount}
                  onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">Apply Discount</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discount Amount (KES)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editSubscriptionForm.discountAmount}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditSubscriptionForm({
                          ...editSubscriptionForm,
                          discountAmount: val,
                          discountPercentage: val ? 0 : editSubscriptionForm.discountPercentage
                        })
                      }}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editSubscriptionForm.discountPercentage}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditSubscriptionForm({
                          ...editSubscriptionForm,
                          discountPercentage: val,
                          discountAmount: val ? 0 : editSubscriptionForm.discountAmount
                        })
                      }}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                {(editSubscriptionForm.discountAmount > 0 || editSubscriptionForm.discountPercentage > 0) && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <span className="text-emerald-400 font-semibold">Final Amount:</span>{' '}
                      <span className="text-xl font-bold text-white">{formatCurrency(calculateDiscountedAmount())}</span>
                    </p>
                    {editSubscriptionForm.discountAmount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Discount: {formatCurrency(editSubscriptionForm.discountAmount)}
                      </p>
                    )}
                    {editSubscriptionForm.discountPercentage > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Discount: {editSubscriptionForm.discountPercentage}% ({formatCurrency((parseFloat(editSubscriptionForm.amount) * parseFloat(editSubscriptionForm.discountPercentage)) / 100)})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={editSubscriptionForm.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value
                      const start = new Date(startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(editSubscriptionForm.months))
                      setEditSubscriptionForm({
                        ...editSubscriptionForm,
                        startDate,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={editSubscriptionForm.endDate}
                    onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, endDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from start date + months</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingSubscription(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Payment</h2>
              <button
                onClick={() => {
                  setEditingPayment(null)
                  setEditPaymentForm({})
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> Only pending payments can be edited. This will update the payment amount before it's completed.
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <strong>User:</strong> {editingPayment.user?.name} (@{editingPayment.user?.tiktokUsername})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                <input
                  type="number"
                  min="1"
                  value={editPaymentForm.months}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, months: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingPayment(null)
                  setEditPaymentForm({})
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {creatingSubscription && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create Subscription</h2>
              <button
                onClick={() => {
                  setCreatingSubscription(false)
                  setNewSubscriptionForm({
                    userId: '',
                    months: 1,
                    amount: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                  })
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select User</label>
                {users.length === 0 ? (
                  <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                    Loading users...
                  </div>
                ) : (
                  <select
                    value={newSubscriptionForm.userId}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, userId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select User --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.tiktokUsername}) - {user.mpesaMobile}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                  <input
                    type="number"
                    min="1"
                    value={newSubscriptionForm.months}
                    onChange={(e) => {
                      const months = e.target.value
                      const start = new Date(newSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(months))
                      setNewSubscriptionForm({
                        ...newSubscriptionForm,
                        months,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSubscriptionForm.amount}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, amount: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newSubscriptionForm.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value
                      const start = new Date(startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(newSubscriptionForm.months))
                      setNewSubscriptionForm({
                        ...newSubscriptionForm,
                        startDate,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date (Auto-calculated)</label>
                  <input
                    type="date"
                    value={(() => {
                      if (newSubscriptionForm.endDate) return newSubscriptionForm.endDate
                      const start = new Date(newSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(newSubscriptionForm.months))
                      return end.toISOString().split('T')[0]
                    })()}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, endDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    readOnly
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from start date + months</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={newSubscriptionForm.status}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong>Total Amount:</strong>{' '}
                  <span className="text-xl font-bold text-white">{formatCurrency(newSubscriptionForm.amount)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Duration: {newSubscriptionForm.months} month{newSubscriptionForm.months != 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCreatingSubscription(false)
                  setNewSubscriptionForm({
                    userId: '',
                    months: 1,
                    amount: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                  })
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubscription}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {tierPurchaseDetailOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-white">Tier purchase</h2>
              <button
                type="button"
                onClick={closeTierPurchaseDetail}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {tierPurchaseDetailLoading || !tierPurchaseDetail ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-10 h-10 text-amber-400 animate-spin" aria-hidden />
                </div>
              ) : (
                (() => {
                  const p = tierPurchaseDetail
                  const cr = p.creatorRewardPurchase
                  const videoUrl = typeof cr?.videoUrl === 'string' ? cr.videoUrl.trim() : ''
                  return (
                    <>
                      {!cr ? (
                        <p className="text-sm text-amber-200/90">
                          This payment has no reward-tier checkout row linked. It may be an older or manual record.
                        </p>
                      ) : null}

                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
                          Tier &amp; on-stream copy
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Tier (at checkout)</span>
                            <p className="text-white font-medium">{cr?.rewardNameSnapshot ?? '—'}</p>
                            {cr?.reward?.name && cr.reward.name !== cr.rewardNameSnapshot ? (
                              <p className="text-gray-400 text-xs mt-0.5">
                                Current tier name: {cr.reward.name}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <span className="text-gray-500">Banner label (snapshot)</span>
                            <p className="text-white font-mono text-xs mt-0.5">{cr?.bannerLabelSnapshot ?? '—'}</p>
                          </div>
                          {cr?.ttsScriptSnapshot ? (
                            <div>
                              <span className="text-gray-500">TTS script (snapshot)</span>
                              <p className="text-gray-200 text-xs mt-1 whitespace-pre-wrap break-words">
                                {cr.ttsScriptSnapshot}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-600/50 bg-gray-900/40 p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Supporter
                        </h3>
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-gray-500">Display name</dt>
                            <dd className="text-white font-medium">{cr?.displayName ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Platform</dt>
                            <dd className="text-white">{shoutoutPlatformLabel(cr?.platform)}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Message</dt>
                            <dd className="text-gray-200 mt-0.5 whitespace-pre-wrap break-words">
                              {cr?.supporterMessage?.trim() ? cr.supporterMessage : (
                                <span className="text-gray-500 italic">None</span>
                              )}
                            </dd>
                          </div>
                          {videoUrl ? (
                            <div className="sm:col-span-2">
                              <dt className="text-gray-500">Video clip</dt>
                              <dd className="mt-1">
                                <a
                                  href={videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm break-all"
                                >
                                  <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                                  {videoUrl}
                                </a>
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      <div className="rounded-lg border border-gray-600/50 bg-gray-900/40 p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Account</h3>
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-gray-500">Name</dt>
                            <dd className="text-white">{p.user?.name ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">TikTok</dt>
                            <dd className="text-white">
                              {p.user?.tiktokUsername ? `@${p.user.tiktokUsername}` : '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">M-Pesa</dt>
                            <dd className="text-white font-mono text-xs">{p.user?.mpesaMobile ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">WhatsApp</dt>
                            <dd className="text-white font-mono text-xs">{p.user?.whatsappNumber ?? '—'}</dd>
                          </div>
                        </dl>
                      </div>

                      <div className="rounded-lg border border-gray-600/50 bg-gray-900/40 p-4 space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment</h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(p.status || '')}`}
                          >
                            {p.status}
                          </span>
                          <span className="text-white font-semibold">{formatAmountForRole(Number(p.amount ?? 0))}</span>
                        </div>
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Payment ID</dt>
                            <dd className="text-gray-300 font-mono text-xs break-all">{p.id}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Created</dt>
                            <dd className="text-gray-300">{p.createdAt ? formatDate(p.createdAt) : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">Completed</dt>
                            <dd className="text-gray-300">{p.completedAt ? formatDate(p.completedAt) : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-500">OBS alert sent</dt>
                            <dd className="text-gray-300">
                              {p.subscriberAlertEmittedAt ? formatDate(p.subscriberAlertEmittedAt) : '—'}
                            </dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-gray-500">Transaction / reference</dt>
                            <dd className="text-gray-300 font-mono text-xs break-all">
                              {p.transactionId || p.reference || '—'}
                            </dd>
                          </div>
                          {p.checkoutRequestId ? (
                            <div className="sm:col-span-2">
                              <dt className="text-gray-500">Checkout request ID</dt>
                              <dd className="text-gray-300 font-mono text-xs break-all">{p.checkoutRequestId}</dd>
                            </div>
                          ) : null}
                          {p.failureReason ? (
                            <div className="sm:col-span-2">
                              <dt className="text-gray-500">Failure reason</dt>
                              <dd className="text-red-300 text-xs whitespace-pre-wrap break-words">{p.failureReason}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                        {p.status?.toLowerCase() === 'completed' && (
                          <button
                            type="button"
                            disabled={replayingPaymentId === p.id}
                            onClick={() => void replayPaymentObsAlert(p.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/40 bg-purple-500/15 text-sm font-semibold text-purple-200 hover:bg-purple-500/25 disabled:opacity-40"
                          >
                            {replayingPaymentId === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                            ) : (
                              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
                            )}
                            Replay OBS alert
                          </button>
                        )}
                        {p.status?.toLowerCase() === 'pending' && isAdminOrSuper() && (
                          <button
                            type="button"
                            onClick={() => {
                              handleEditPayment(p)
                              closeTierPurchaseDetail()
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-sm font-semibold text-white"
                          >
                            Edit pending payment
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={closeTierPurchaseDetail}
                          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold text-white"
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
