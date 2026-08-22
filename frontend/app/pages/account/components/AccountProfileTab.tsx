import { UserProfile } from "@clerk/react";

export function AccountProfileTab() {
    return (
        <div className="flex justify-center w-full min-h-[600px]">
            {/* We just render UserProfile. Clerk handles the width, we give it full width container. */}
            <UserProfile 
                routing="hash" 
                appearance={{ 
                    elements: { 
                        rootBox: "w-full max-w-4xl mx-auto",
                        cardBox: "w-full shadow-sm border border-border rounded-2xl bg-white dark:bg-zinc-950"
                    } 
                }} 
            />
        </div>
    );
}
