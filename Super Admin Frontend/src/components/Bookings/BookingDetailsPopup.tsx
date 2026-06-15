
import { X, Calendar, User, Plane, Car, CreditCard, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    open: boolean;
    booking: any;
    onClose: () => void;
};

const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0 group">
        <div className="flex items-center gap-2">
            {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />}
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">{label}</span>
        </div>
        <span className="font-medium text-slate-200 text-sm">
            {value || "-"}
        </span>
    </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: any }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-700/50">
        <Icon className="w-4 h-4 text-sky-400" />
        <h4 className="text-xs font-bold text-white uppercase tracking-widest">
            {title}
        </h4>
    </div>
);

export default function BookingDetailsPopup({
    open,
    booking,
    onClose,
}: Props) {
    if (!open || !booking) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="glass w-full max-w-4xl rounded-3xl overflow-hidden relative z-10 shadow-2xl border-white/5 flex flex-col max-h-[90vh]"
                >
                    {/* HEADER */}
                    <div className="flex justify-between items-center px-8 py-6 border-b border-slate-800 bg-slate-900/50">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-bold text-white">
                                    Booking Details
                                </h3>
                                <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded text-[10px] font-bold uppercase tracking-tight">
                                    {booking.ref_no}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 italic">ID: #{booking.id}</p>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white border border-transparent hover:border-slate-700"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="p-8 space-y-8 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Travel Info */}
                            <div className="glass p-5 rounded-2xl border-slate-800/50">
                                <SectionTitle title="Travel Information" icon={Calendar} />
                                <div className="space-y-1">
                                    <InfoRow label="Booked On" value={formatDate(booking.created_at)} />
                                    <InfoRow label="Drop-off Date" value={formatDate(booking.drop_off_date)} />
                                    <InfoRow label="Return Date" value={formatDate(booking.return_date)} />
                                </div>
                            </div>

                            {/* Booking Info */}
                            <div className="glass p-5 rounded-2xl border-slate-800/50">
                                <SectionTitle title="Booking context" icon={Info} />
                                <div className="space-y-1">
                                    <InfoRow label="Product" value={booking.product_name} />
                                    <InfoRow label="Airport" value={booking.travelling_from} />
                                    <InfoRow label="Service" value={booking.service} />
                                    <InfoRow label="Source" value={booking.source} />
                                </div>
                            </div>

                            {/* Customer Info */}
                            <div className="glass p-5 rounded-2xl border-slate-800/50">
                                <SectionTitle title="Customer Details" icon={User} />
                                <div className="space-y-1">
                                    <InfoRow label="Full Name" value={`${booking.first_name || ''} ${booking.last_name || ''}`} />
                                    <InfoRow label="Phone" value={booking.mobile} />
                                    <InfoRow label="Email" value={booking.email} />
                                </div>
                            </div>

                            {/* Flight Info */}
                            <div className="glass p-5 rounded-2xl border-slate-800/50">
                                <SectionTitle title="Flight Details" icon={Plane} />
                                <div className="space-y-1">
                                    <InfoRow label="Depart Flight" value={booking.dept_flight_no} />
                                    <InfoRow label="Depart Terminal" value={booking.dept_terminal} />
                                    <InfoRow label="Return Flight" value={booking.return_flight_no} />
                                    <InfoRow label="Return Terminal" value={booking.return_terminal} />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Details */}
                        <div className="glass p-6 rounded-2xl border-slate-800/50">
                            <SectionTitle title="Vehicle Information" icon={Car} />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Make</p>
                                    <p className="text-slate-200 font-medium">{booking.make || "TBC"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Model</p>
                                    <p className="text-slate-200 font-medium">{booking.model || "TBC"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Colour</p>
                                    <p className="text-slate-200 font-medium">{booking.color || "TBC"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Registration</p>
                                    <p className="text-sky-400 font-bold bg-sky-500/5 px-2 py-1 rounded border border-sky-500/20 inline-block">
                                        {booking.vehicle_registration || "TBC"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="glass p-6 rounded-2xl border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-indigo-900/10">
                            <SectionTitle title="Payment Summary" icon={CreditCard} />
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Quote</p>
                                    <p className="text-slate-200">£{booking.quote_price || "0.00"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fees</p>
                                    <p className="text-slate-200">£{booking.booking_fees || "0.00"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Discount</p>
                                    <p className="text-rose-400">-£{booking.discount_amount || "0.00"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Paid</p>
                                    <p className="text-emerald-400 font-bold text-lg">£{booking.total_payable || "0.00"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-tighter shadow-sm border ${booking.status === "Active" || booking.status === "Confirmed"
                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            : booking.status === "Cancelled"
                                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                : booking.status === "Amended" || booking.status === "Extended"
                                                    ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                        }`}>
                                        {booking.status}
                                    </span>
                                </div>
                            </div>
                            {booking.transaction_id && (
                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Transaction ID</p>
                                    <p className="text-slate-400 font-mono text-xs">{booking.transaction_id}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div className="flex justify-end border-t border-slate-800 px-8 py-5 bg-slate-900/50">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all border border-slate-700 shadow-lg"
                        >
                            Close Details
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
