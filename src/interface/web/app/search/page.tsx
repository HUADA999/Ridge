"use client";

import { Input } from "@/components/ui/input";

import { useEffect, useRef, useState } from "react";
import styles from "./search.module.css";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ArrowLeft,
    ArrowRight,
    FileDashed,
    FileMagnifyingGlass,
    GithubLogo,
    Lightbulb,
    LinkSimple,
    MagnifyingGlass,
    NoteBlank,
    NotionLogo,
    Eye,
    Trash,
    ArrowsOutSimple,
    DotsThreeVertical,
    Waveform,
    Plus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getIconFromFilename } from "../common/iconUtils";
import { formatDateTime, useIsMobileWidth } from "../common/utils";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "../components/appSidebar/appSidebar";
import { Separator } from "@/components/ui/separator";
import { RidgeLogoType } from "../components/logo/ridgeLogo";
import { InlineLoading } from "../components/loading/loading";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
    AlertDialogAction,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Scroll } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { uploadDataForIndexing } from "../common/chatFunctions";
import { CommandDialog } from "@/components/ui/command";
import { Progress } from "@/components/ui/progress";
interface AdditionalData {
    file: string;
    source: string;
    compiled: string;
    heading: string;
}

interface SearchResult {
    type: string;
    additional: AdditionalData;
    entry: string;
    score: number;
    "corpus-id": string;
}

interface FileObject {
    file_name: string;
    raw_text: string;
    updated_at: string;
}

function getNoteTypeIcon(source: string) {
    if (source === "notion") {
        return <NotionLogo className="text-muted-foreground" />;
    }
    if (source === "github") {
        return <GithubLogo className="text-muted-foreground" />;
    }
    return <NoteBlank className="text-muted-foreground" />;
}

const naturalLanguageSearchQueryExamples = [
    "What does the paper say about climate change?",
    "Making a cappuccino at home",
    "Benefits of eating mangoes",
    "How to plan a wedding on a budget",
    "Appointment with Dr. Makinde on 12th August",
    "Class notes lecture 3 on quantum mechanics",
    "Painting concepts for acrylics",
    "Abstract from the paper attention is all you need",
    "Climbing Everest without oxygen",
    "Solving a rubik's cube in 30 seconds",
    "Facts about the planet Mars",
    "How to make a website using React",
    "Fish at the bottom of the ocean",
    "Fish farming Kenya 2021",
    "How to make a cake without an oven",
    "Installing a solar panel at home",
];

interface NoteResultProps {
    note: SearchResult;
    setFocusSearchResult: (note: SearchResult) => void;
}

function Note(props: NoteResultProps) {
    const note = props.note;
    const isFileNameURL = (note.additional.file || "").startsWith("http");
    const fileName = isFileNameURL
        ? note.additional.heading
        : note.additional.file.split("/").pop();
    const fileIcon = getIconFromFilename(fileName || ".txt", "h-4 w-4 inline mr-2");

    return (
        <Card className="bg-secondary h-full shadow-sm rounded-lg border border-muted mb-4 animate-fade-in-up">
            <CardHeader>
                <CardTitle className="inline-flex gap-2">
                    {getNoteTypeIcon(note.additional.source)}
                    {fileName}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="line-clamp-4 text-muted-foreground">{note.entry}</div>
                <Button
                    onClick={() => props.setFocusSearchResult(note)}
                    variant={"ghost"}
                    className="p-0 mt-2 text-orange-400 hover:bg-inherit"
                >
                    See content
                    <ArrowRight className="inline ml-2" />
                </Button>
            </CardContent>
            <CardFooter>
                {isFileNameURL ? (
                    <a
                        href={note.additional.file}
                        target="_blank"
                        className="underline text-sm bg-muted p-1 rounded-lg text-muted-foreground"
                    >
                        <LinkSimple className="inline m-2" />
                        {note.additional.file}
                    </a>
                ) : (
                    <div className="bg-muted p-2 text-sm rounded-lg text-muted-foreground">
                        {fileIcon}
                        {note.additional.file}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

function focusNote(note: SearchResult) {
    const isFileNameURL = (note.additional.file || "").startsWith("http");
    const fileName = isFileNameURL
        ? note.additional.heading
        : note.additional.file.split("/").pop();
    const fileIcon = getIconFromFilename(fileName || ".txt", "h-4 w-4 inline mr-2");

    return (
        <Card className="bg-secondary h-full shadow-sm rounded-lg border border-muted mb-4">
            <CardHeader>
                <CardTitle>{fileName}</CardTitle>
            </CardHeader>
            <CardFooter>
                {isFileNameURL ? (
                    <a
                        href={note.additional.file}
                        target="_blank"
                        className="underline text-sm bg-muted p-3 rounded-lg text-muted-foreground flex items-center gap-2"
                    >
                        <LinkSimple className="inline" />
                        {note.additional.file}
                    </a>
                ) : (
                    <div className="bg-muted p-3 text-sm rounded-lg text-muted-foreground flex items-center gap-2">
                        {fileIcon}
                        {note.additional.file}
                    </div>
                )}
            </CardFooter>
            <CardContent>
                <div className="text-m">{note.entry}</div>
            </CardContent>
        </Card>
    );
}

const UploadFiles: React.FC<{
    onClose: () => void;
    setUploadedFiles: (files: string[]) => void;
}> = ({ onClose, setUploadedFiles }) => {
    const [syncedFiles, setSyncedFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDragAndDropping, setIsDragAndDropping] = useState(false);

    const [warning, setWarning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!uploading) {
            setProgressValue(0);
        }

        if (uploading) {
            const interval = setInterval(() => {
                setProgressValue((prev) => {
                    const increment = Math.floor(Math.random() * 5) + 1; // Generates a random number between 1 and 5
                    const nextValue = prev + increment;
                    return nextValue < 100 ? nextValue : 100; // Ensures progress does not exceed 100
                });
            }, 800);
            return () => clearInterval(interval);
        }
    }, [uploading]);

    const filteredFiles = syncedFiles.filter((file) =>
        file.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragAndDropping(true);
    }

    function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragAndDropping(false);
    }

    function handleDragAndDropFiles(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        setIsDragAndDropping(false);

        if (!event.dataTransfer.files) return;

        uploadFiles(event.dataTransfer.files);
    }

    function openFileInput() {
        if (fileInputRef && fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files) return;

        uploadFiles(event.target.files);
    }

    function uploadFiles(files: FileList) {
        uploadDataForIndexing(files, setWarning, setUploading, setError, setUploadedFiles);
    }

    return (
        <div
            className={`flex flex-col h-full`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDragAndDropFiles}
            onClick={openFileInput}
        >
            <input
                type="file"
                multiple
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
            />
            <div className="flex-none p-4">
                {uploading && (
                    <Progress
                        indicatorColor="bg-slate-500"
                        className="w-full h-2 rounded-full"
                        value={progressValue}
                    />
                )}
            </div>
            <div
                className={`flex-none p-4 bg-secondary border-b ${isDragAndDropping ? "animate-pulse" : ""} rounded-lg`}
            >
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg">
                    {isDragAndDropping ? (
                        <div className="flex items-center justify-center w-full h-full">
                            <Waveform className="h-6 w-6 mr-2" />
                            <span>Drop files to upload</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full h-full">
                            <Plus className="h-6 w-6 mr-2" />
                            <span>Drag and drop files here</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function Search() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
    const [searchResultsLoading, setSearchResultsLoading] = useState(false);
    const [focusSearchResult, setFocusSearchResult] = useState<SearchResult | null>(null);
    const [files, setFiles] = useState<FileObject[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [fileObjectsLoading, setFileObjectsLoading] = useState(true);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [selectedFileFullText, setSelectedFileFullText] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [filteredFiles, setFilteredFiles] = useState<string[]>([]);

    const { toast } = useToast();

    const isMobileWidth = useIsMobileWidth();

    function search() {
        if (searchResultsLoading || !searchQuery.trim()) return;

        setSearchResultsLoading(true);

        const apiUrl = `/api/search?q=${encodeURIComponent(searchQuery)}&client=web`;
        fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((data) => {
                setSearchResults(data);
                setSearchResultsLoading(false);
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    const deleteSelected = async () => {
        let filesToDelete = selectedFiles.length > 0 ? selectedFiles : filteredFiles;

        if (filesToDelete.length === 0) {
            return;
        }

        try {
            const response = await fetch("/api/content/files", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ files: filesToDelete }),
            });

            if (!response.ok) throw new Error("Failed to delete files");

            // Update the syncedFiles state
            setUploadedFiles((prevFiles) =>
                prevFiles.filter((file) => !filesToDelete.includes(file)),
            );

            // Reset selectedFiles
            setSelectedFiles([]);
        } catch (error) {
            console.error("Error deleting files:", error);
        }
    };

    const fetchFiles = async () => {
        try {
            const response = await fetch("/api/content/all");
            if (!response.ok) throw new Error("Failed to fetch files");

            const filesList = await response.json();
            if (Array.isArray(filesList)) {
                setFiles(filesList.toSorted());
            }
        } catch (error) {
            setError("Failed to load files");
            console.error("Error fetching files:", error);
        } finally {
            setFileObjectsLoading(false);
        }
    };

    const fetchSpecificFile = async (fileName: string) => {
        try {
            const response = await fetch(`/api/content/file?file_name=${fileName}`);
            if (!response.ok) throw new Error("Failed to fetch file");

            const file = await response.json();
            setSelectedFileFullText(file.raw_text);
        } catch (error) {
            setError("Failed to load file");
            console.error("Error fetching file:", error);
        }
    };

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            return;
        }

        setFocusSearchResult(null);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                search();
            }, 750); // 1000 milliseconds = 1 second
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    useEffect(() => {
        if (selectedFile) {
            fetchSpecificFile(selectedFile);
        }
    }, [selectedFile]);

    useEffect(() => {
        fetchFiles();
    }, []);

    useEffect(() => {
        if (uploadedFiles.length > 0) {
            fetchFiles();
        }
    }, [uploadedFiles]);

    const handleDelete = async (fileName: string) => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/content/file?filename=${fileName}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete file");
            toast({
                title: "File deleted",
                description: `File ${fileName} has been deleted`,
                variant: "default",
            });

            // Refresh files list
            fetchFiles();
        } catch (error) {
            toast({
                title: "Error deleting file",
                description: `Failed to delete file ${fileName}`,
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar conversationId={""} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    {isMobileWidth ? (
                        <a className="p-0 no-underline" href="/">
                            <RidgeLogoType className="h-auto w-16" />
                        </a>
                    ) : (
                        <h2 className="text-lg">Search</h2>
                    )}
                </header>
                <div>
                    <div className={`${styles.searchLayout}`}>
                        <div className="md:w-3/4 sm:w-full mx-auto pt-6 md:pt-8">
                            <div className="p-4 md:w-3/4 sm:w-full mx-auto">
                                <div className="flex justify-between items-center border-2 border-muted p-1 gap-1 rounded-lg">
                                    <Input
                                        autoFocus={true}
                                        className="border-none pl-4 focus-visible:ring-transparent focus-visible:ring-offset-transparent"
                                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                                        onKeyDown={(e) => e.key === "Enter" && search()}
                                        type="search"
                                        placeholder="Search Documents"
                                    />
                                    <Button
                                        className="px-2 gap-2 inline-flex rounded-none items-center border-l border-gray-300 hover:text-gray-500"
                                        variant={"ghost"}
                                        onClick={() => search()}
                                    >
                                        <MagnifyingGlass className="h-4 w-4" />
                                        <span>Find</span>
                                    </Button>
                                </div>
                                <UploadFiles
                                    onClose={() => {}}
                                    setUploadedFiles={setUploadedFiles}
                                />
                                {searchResultsLoading && (
                                    <div className="mt-4 flex items-center justify-center">
                                        <InlineLoading
                                            className="mt-4"
                                            message={"Searching"}
                                            iconClassName="h-5 w-5"
                                        />
                                    </div>
                                )}
                                {focusSearchResult && (
                                    <div className="mt-4">
                                        <Button
                                            onClick={() => setFocusSearchResult(null)}
                                            className="mb-4"
                                            variant={"outline"}
                                        >
                                            <ArrowLeft className="inline mr-2" />
                                            Back
                                        </Button>
                                        {focusNote(focusSearchResult)}
                                    </div>
                                )}
                                {!focusSearchResult &&
                                    !searchResultsLoading &&
                                    searchResults &&
                                    searchResults.length > 0 && (
                                        <div className="mt-4 max-w-[92vw] break-all">
                                            <ScrollArea className="h-[80vh]">
                                                {searchResults.map((result, index) => {
                                                    return (
                                                        <Note
                                                            key={result["corpus-id"]}
                                                            note={result}
                                                            setFocusSearchResult={
                                                                setFocusSearchResult
                                                            }
                                                        />
                                                    );
                                                })}
                                            </ScrollArea>
                                        </div>
                                    )}
                                {searchResults === null && (
                                    <div className="w-full mt-4">
                                        {fileObjectsLoading && (
                                            <div className="mt-4 flex items-center justify-center">
                                                <InlineLoading
                                                    className="mt-4"
                                                    message={"Loading"}
                                                    iconClassName="h-5 w-5"
                                                />
                                            </div>
                                        )}
                                        {error && <div className="text-red-500">{error}</div>}

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {files.map((file, index) => (
                                                <Card
                                                    key={index}
                                                    className="animate-fade-in-up bg-secondary h-52"
                                                >
                                                    <CardHeader className="p-2">
                                                        <CardTitle
                                                            className="flex items-center gap-2"
                                                            title={file.file_name}
                                                        >
                                                            <div className="text-sm font-medium truncate hover:text-clip hover:whitespace-normal">
                                                                {file.file_name.split("/").pop()}
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger>
                                                                    <Button variant={"ghost"}>
                                                                        <DotsThreeVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent className="flex flex-col gap-0 w-fit">
                                                                    <DropdownMenuItem className="p-0">
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger>
                                                                                <Button
                                                                                    variant={
                                                                                        "ghost"
                                                                                    }
                                                                                    className="flex items-center gap-2 p-1 text-sm"
                                                                                >
                                                                                    <Trash className="h-4 w-4" />
                                                                                    <span className="text-xs">
                                                                                        Delete
                                                                                    </span>
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>
                                                                                        Delete File
                                                                                    </AlertDialogTitle>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogDescription>
                                                                                    Are you sure you
                                                                                    want to delete
                                                                                    this file?
                                                                                </AlertDialogDescription>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel>
                                                                                        Cancel
                                                                                    </AlertDialogCancel>
                                                                                    <AlertDialogAction
                                                                                        onClick={() =>
                                                                                            handleDelete(
                                                                                                file.file_name,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {isDeleting
                                                                                            ? "Deleting..."
                                                                                            : "Delete"}
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="p-0">
                                                                        <Dialog>
                                                                            <DialogTrigger>
                                                                                <Button
                                                                                    variant={
                                                                                        "ghost"
                                                                                    }
                                                                                    className="flex items-center gap-2 p-1 text-sm"
                                                                                    onClick={() => {
                                                                                        setSelectedFileFullText(
                                                                                            null,
                                                                                        );
                                                                                        setSelectedFile(
                                                                                            file.file_name,
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    <ArrowsOutSimple className="h-4 w-4" />
                                                                                    <span className="text-xs">
                                                                                        View Full
                                                                                        Text
                                                                                    </span>
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent>
                                                                                <DialogHeader>
                                                                                    <DialogTitle>
                                                                                        {file.file_name
                                                                                            .split(
                                                                                                "/",
                                                                                            )
                                                                                            .pop()}
                                                                                    </DialogTitle>
                                                                                </DialogHeader>
                                                                                <ScrollArea className="h-[50vh]">
                                                                                    <p className="whitespace-pre-wrap break-words text-sm font-normal">
                                                                                        {
                                                                                            selectedFileFullText
                                                                                        }
                                                                                    </p>
                                                                                </ScrollArea>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-2">
                                                        <ScrollArea className="h-24">
                                                            <p className="whitespace-pre-wrap break-words text-sm font-normal text-muted-foreground p-2 rounded-lg bg-background">
                                                                {file.raw_text.slice(0, 100)}...
                                                            </p>
                                                        </ScrollArea>
                                                    </CardContent>
                                                    <CardFooter className="flex justify-end gap-2 p-2">
                                                        <div className="text-muted-foreground text-xs">
                                                            {formatDateTime(file.updated_at)}
                                                        </div>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {searchResults && searchResults.length === 0 && (
                                    <Card className="flex flex-col items-center justify-center border-none shadow-none">
                                        <CardHeader className="flex flex-col items-center justify-center">
                                            <CardDescription className="border-muted-foreground border w-fit rounded-lg mb-2 text-center text-lg p-4">
                                                <FileDashed
                                                    weight="fill"
                                                    className="text-muted-foreground h-10 w-10"
                                                />
                                            </CardDescription>
                                            <CardTitle className="text-center">
                                                No documents found
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-muted-foreground items-center justify-center text-center flex">
                                                To use search, upload your docs to your account.
                                            </div>
                                            <Link
                                                href="https://docs.ridge.dev/data-sources/share_your_data"
                                                className="no-underline"
                                            >
                                                <div className="mt-4 text-center text-secondary-foreground bg-secondary w-fit m-auto p-2 rounded-lg">
                                                    Learn More
                                                </div>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
