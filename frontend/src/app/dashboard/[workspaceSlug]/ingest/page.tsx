"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Table,
  Trash2,
  UploadCloud,
} from "lucide-react";

import {
  useDatasets,
  useDeleteDataset,
  useUploadDataset,
} from "@/hooks/use-datasets";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function DataIngestionStudioPage() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string;

  const { data: datasets, isLoading } = useDatasets(workspaceSlug);
  const uploadMutation = useUploadDataset(workspaceSlug);
  const deleteMutation = useDeleteDataset(workspaceSlug);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setDatasetName(
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name
      );
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setDatasetName(
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name
      );
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setErrorMsg(null);

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        datasetName: datasetName.trim() || undefined,
      });
      setSelectedFile(null);
      setDatasetName("");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Failed to upload dataset"
      );
    }
  };

  const handleDelete = async (datasetId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete dataset '${name}'?`)) return;
    try {
      await deleteMutation.mutateAsync(datasetId);
    } catch (err: any) {
      alert("Failed to delete dataset: " + (err.message || "Unknown error"));
    }
  };

  const filteredDatasets =
    datasets?.filter(
      (ds) =>
        ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.file_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 md:p-10 text-white space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm">
            <Database className="w-4 h-4" />
            <span>Module 2 • Data Ingestion & Analytics Engine</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Enterprise Data Ingestion Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload business datasets (CSV, Excel, JSON, Parquet) for automated schema profiling and DuckDB OLAP indexing.
          </p>
        </div>
      </div>

      {/* Upload Studio Card */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-indigo-400" />
          Dataset Dropzone & Upload Pipeline
        </h2>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-500/30 flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
                : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
            }`}
          >
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={handleFileSelect}
              accept=".csv,.xlsx,.xls,.json,.parquet"
            />
            <label htmlFor="fileInput" className="cursor-pointer w-full">
              <div className="w-14 h-14 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
              </div>
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-white font-medium text-base">
                    {selectedFile.name}
                  </p>
                  <p className="text-indigo-400 text-sm">
                    {formatBytes(selectedFile.size)} • Click to replace file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-slate-200 font-medium text-base">
                    Drag and drop your dataset here, or{" "}
                    <span className="text-indigo-400 underline decoration-indigo-400/50">
                      browse files
                    </span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    Supported enterprise formats: CSV, Excel (.xlsx), JSON, and Apache Parquet (up to 500MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {selectedFile && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Dataset Display Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. Q4 Revenue Transactions"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2 sm:pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setDatasetName("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ingesting & Profiling...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Dataset</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Datasets List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Workspace Datasets ({datasets?.length || 0})
            </h2>
            <p className="text-slate-400 text-sm">
              Manage your datasets, inspect schema quality scorecards, or launch DuckDB OLAP queries.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search datasets..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
            <span>Loading workspace datasets...</span>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">No datasets uploaded yet</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Upload a CSV, Excel, or JSON dataset using the studio dropzone above to begin automated schema profiling.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Dataset Name</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Size</th>
                    <th className="px-6 py-4">Rows / Cols</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredDatasets.map((ds) => (
                    <tr
                      key={ds.id}
                      className="hover:bg-slate-800/40 transition duration-150"
                    >
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            {ds.file_type === "EXCEL" ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            ) : ds.file_type === "JSON" ? (
                              <FileText className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Table className="w-4 h-4 text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{ds.name}</p>
                            <p className="text-xs text-slate-500 font-mono">
                              {ds.file_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {ds.file_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {formatBytes(ds.file_size_bytes)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300 font-mono text-xs">
                          {ds.row_count !== null && ds.row_count !== undefined
                            ? `${ds.row_count.toLocaleString()} rows`
                            : "—"}
                          <span className="text-slate-500 mx-1">•</span>
                          {ds.column_count !== null && ds.column_count !== undefined
                            ? `${ds.column_count} cols`
                            : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {ds.status === "READY" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            READY
                          </span>
                        ) : ds.status === "PROCESSING" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            PROCESSING
                          </span>
                        ) : ds.status === "ERROR" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertCircle className="w-3.5 h-3.5" />
                            ERROR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
                            {ds.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/${workspaceSlug}/datasets/${ds.id}`}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
                          >
                            Inspect Schema & OLAP
                          </Link>
                          <button
                            onClick={() => handleDelete(ds.id, ds.name)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
