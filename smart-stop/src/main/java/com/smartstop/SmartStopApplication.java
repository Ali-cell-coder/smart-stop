package com.smartstop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class SmartStopApplication {

	public static void main(String[] args) {
		SpringApplication.run(SmartStopApplication.class, args);
	}

}
