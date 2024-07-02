'use client'

import styles from './navMenu.module.css';
import Link from 'next/link';
import { useAuthenticatedData, UserProfile } from '@/app/common/auth';
import { useState, useEffect } from 'react';

import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
} from "@/components/ui/menubar";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface NavMenuProps {
    selected: string;
    showLogo?: boolean;
    title?: string;
}

export default function NavMenu(props: NavMenuProps) {

    const userData = useAuthenticatedData();
    const [displayTitle, setDisplayTitle] = useState<string>(props.title || props.selected.toUpperCase());

    const [isMobileWidth, setIsMobileWidth] = useState(false);

    useEffect(() => {
        setIsMobileWidth(window.innerWidth < 768);
        setDisplayTitle(props.title || props.selected.toUpperCase());

    }, [props.title]);

    return (
        <div className={styles.titleBar}>
            <div className={`text-nowrap text-ellipsis overflow-hidden max-w-screen-md grid items-top font-bold mr-8`}>
                {displayTitle && <h2 className={`text-lg text-ellipsis whitespace-nowrap overflow-x-hidden`} >{displayTitle}</h2>}
            </div>
            {
                isMobileWidth ?
                    <DropdownMenu>
                        <DropdownMenuTrigger>=</DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>
                                <Link href='/chat' className={`${props.selected.toLowerCase() === 'chat' ? styles.selected : ''} hover:bg-background`}>Chat</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Link href='/agents' className={`${props.selected.toLowerCase() === 'agent' ? styles.selected : ''} hover:bg-background`}>Agents</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Link href='/automations' className={`${props.selected.toLowerCase() === 'automations' ? styles.selected : ''} hover:bg-background`}>Automations</Link>
                            </DropdownMenuItem>
                            {userData && <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Profile</DropdownMenuLabel>
                                <DropdownMenuItem>
                                    <Link href="/config">Settings</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="https://docs.ridge.dev">Help</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Link href="/auth/logout">Logout</Link>
                                </DropdownMenuItem>
                            </>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    :
                    <Menubar className='items-top'>
                        <MenubarMenu>
                            <Link href='/chat' className={`${props.selected.toLowerCase() === 'chat' ? styles.selected : ''} hover:bg-background`}>
                                <MenubarTrigger>Chat</MenubarTrigger>
                            </Link>
                        </MenubarMenu>
                        <MenubarMenu>
                            <Link href='/agents' className={`${props.selected.toLowerCase() === 'agent' ? styles.selected : ''} hover:bg-background`}>
                                <MenubarTrigger>Agents</MenubarTrigger>
                            </Link>
                        </MenubarMenu>
                        <MenubarMenu>
                            <Link href='/automations' className={`${props.selected.toLowerCase() === 'automations' ? styles.selected : ''} hover:bg-background`}>
                                <MenubarTrigger>Automations</MenubarTrigger>
                            </Link>
                        </MenubarMenu>
                        {userData &&
                            <MenubarMenu>
                                <MenubarTrigger>Profile</MenubarTrigger>
                                <MenubarContent>
                                    <MenubarItem>
                                        <Link href="/config">
                                            Settings
                                        </Link>
                                    </MenubarItem>
                                    <MenubarSeparator />
                                    <MenubarItem>
                                        <Link href="https://docs.ridge.dev">
                                            Help
                                        </Link>
                                    </MenubarItem>
                                    <MenubarSeparator />
                                    <MenubarItem>
                                        <Link href="/auth/logout">
                                            Logout
                                        </Link>
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                        }
                    </Menubar>
            }
        </div>
    )
}
