"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Eye, RotateCcw, Loader2 } from "lucide-react";
import { Job } from "@/types/job";
import { fetchJobs, retryJob } from "@/lib/api/jobs";

export default function JobsDashboard() {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobList, setJobList] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchJobs();
        setJobList(data);
      } catch (err) {
        console.error("Failed to load jobs", err);
        setError(err instanceof Error ? err.message : "Failed to load jobs");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleView = (job: Job) => setSelectedJob(job);
  const handleClose = () => setSelectedJob(null);

  const handleRetry = async (jobId: string) => {
    try {
      const updatedJob = await retryJob(jobId);
      setJobList((prev) =>
        prev.map((job) => (job.id === jobId ? updatedJob : job))
      );
      if (selectedJob?.id === jobId) {
        setSelectedJob(updatedJob);
      }
    } catch (err) {
      console.error("Failed to retry job", err);
    }
  };

  const filteredJobs = jobList.filter((job) =>
    job.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const currentJobs = filteredJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <p className="text-red-500 font-semibold">{error}</p>
        <Button onClick={() => { setLoading(true); setError(null); fetchJobs().then(setJobList).catch(err => setError(err.message)).finally(() => setLoading(false)); }}>Retry</Button>
      </div>
    );
  }

  return (
    <section className="w-full h-full">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Jobs</h1>
        <p className="dashboard-page-subtitle">Monitor and manage processing jobs.</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="relative w-full lg:w-116">
          <Input 
            type="search" 
            placeholder="Search jobs by ID or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-3 md:hidden mb-6">
        {currentJobs.map((job) => (
          <article key={`mobile-${job.id}`} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Job #{job.id}</p>
              <h3 className="text-base font-semibold text-foreground">{job.email}</h3>
              <p className="break-all text-sm text-muted-foreground capitalize">
                Status: {job.status}
              </p>
            </div>
            <div className="mt-3">
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                  Action
                  <ChevronDown className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => handleView(job)}>
                    <Eye className="mr-2 size-4" /> View Details
                  </DropdownMenuItem>
                  {job.status === "failed" && (
                    <DropdownMenuItem onClick={() => handleRetry(job.id)}>
                      <RotateCcw className="mr-2 size-4" /> Retry Job
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden w-full overflow-x-auto md:block mb-6">
        <div className="min-w-180">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="h-11.5 bg-primary">
                <th className="w-20 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                  Job ID
                </th>
                <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                  Email
                </th>
                <th className="w-20 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                  Status
                </th>
                <th className="w-24 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                  Created
                </th>
                <th className="w-15 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {currentJobs.map((job) => (
                <tr key={job.id} className="h-13">
                  <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                    {job.id}
                  </td>
                  <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                    {job.email}
                  </td>
                  <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground capitalize lg:text-[16px]">
                    {job.status}
                  </td>
                  <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                    {job.created}
                  </td>
                  <td className="border border-border px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-1 rounded-[5px] bg-primary px-2 text-sm leading-[1.2] font-normal text-primary-foreground lg:text-[16px]">
                        Action
                        <ChevronDown className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => handleView(job)}>
                          <Eye className="mr-2 size-4" /> View Details
                        </DropdownMenuItem>
                        {job.status === "failed" && (
                          <DropdownMenuItem onClick={() => handleRetry(job.id)}>
                            <RotateCcw className="mr-2 size-4" /> Retry Job
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-4 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="px-2 text-sm leading-6 font-medium">
          Showing {filteredJobs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
          {Math.min(currentPage * itemsPerPage, filteredJobs.length)} out of {filteredJobs.length}
        </p>

        <div className="flex items-center gap-2.5 px-2 py-1 text-sm leading-6 font-medium lg:text-[16px]">
          <button 
            type="button" 
            className={`px-1 py-0.5 ${currentPage === 1 ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              className={`h-6 min-w-6 px-1 py-0.5 ${page === currentPage ? 'bg-primary text-primary-foreground' : 'cursor-pointer text-muted-foreground hover:text-foreground'}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button 
            type="button" 
            className={`px-1 py-0.5 ${currentPage === Math.max(1, totalPages) ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(1, totalPages)))}
            disabled={currentPage === Math.max(1, totalPages)}
          >
            Next
          </button>
        </div>
      </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl bg-white text-gray-900 border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>

          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong className="text-foreground">Job ID:</strong> <span className="text-muted-foreground">{selectedJob.id}</span></div>
                <div><strong className="text-foreground">Email:</strong> <span className="text-muted-foreground">{selectedJob.email}</span></div>
                <div><strong className="text-foreground">Status:</strong> <span className="text-muted-foreground capitalize">{selectedJob.status}</span></div>
                <div><strong className="text-foreground">Created:</strong> <span className="text-muted-foreground">{selectedJob.created}</span></div>
              </div>

              {selectedJob.status === "failed" && selectedJob.error && (
                <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                  {selectedJob.error}
                </div>
              )}

              <div>
                <strong className="text-foreground text-sm block mb-2">Input Images:</strong>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.inputImages.map((img: string, idx: number) => (
                    <div key={idx} className="relative w-20 h-20 rounded-md border overflow-hidden bg-gray-100">
                      <img src={img} alt="input" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong className="text-foreground text-sm block mb-2">Selected Image:</strong>
                  {selectedJob.selectedImage ? (
                    <div className="relative w-32 h-32 rounded-md border overflow-hidden bg-gray-100">
                      <img src={selectedJob.selectedImage} alt="selected" className="w-full h-full object-cover" />
                    </div>
                  ) : <span className="text-sm text-muted-foreground">None</span>}
                </div>
                <div>
                  <strong className="text-foreground text-sm block mb-2">Output Image:</strong>
                  {selectedJob.outputImage ? (
                    <div className="relative w-32 h-32 rounded-md border overflow-hidden bg-gray-100">
                      <img src={selectedJob.outputImage} alt="output" className="w-full h-full object-cover" />
                    </div>
                  ) : <span className="text-sm text-muted-foreground">None</span>}
                </div>
              </div>

              {selectedJob.status === "failed" && (
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button variant="default" onClick={() => handleRetry(selectedJob.id)}>
                    <RotateCcw className="mr-2 size-4" /> Retry Job
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
